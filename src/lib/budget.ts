import { api, CategoryGroupWithCategories, CurrencyFormat } from "ynab";
import {
  FilteredAccount,
  FilteredCategory,
  FilteredPayee,
  Group,
  Subtransaction,
  YnabErrorResponse
} from "../../worker-configuration";

export const getAndFilterAccounts = async (
  id: string,
  accessToken: string,
  currencyFormat: CurrencyFormat
) => {
  try {
    const ynabApi = new api(accessToken);
    const response = await ynabApi.accounts.getAccounts(id);
    const accounts = response.data.accounts;
    const budget: FilteredAccount[] = [];
    const tracking: FilteredAccount[] = [];
    accounts.forEach((account) => {
      if (!account.deleted && !account.closed) {
        const filteredAccount = {
          id: account.id,
          name: account.name,
          balance: formatAmount(account.balance / 1000, currencyFormat)
        } as FilteredAccount;
        account.on_budget ? budget.push(filteredAccount) : tracking.push(filteredAccount);
      }
    });
    return [
      {
        name: "Budget Accounts",
        items: budget
      },
      {
        name: "Tracking Accounts",
        items: tracking
      }
    ];
  } catch (error) {
    console.error("get budgets error", error);
    const response = error as YnabErrorResponse;
    const err = response.error;
    throw {
      name: err.name,
      detail: err.detail,
      id: err.id
    };
  }
};

export const getPayees = async (id: string, accessToken: string) => {
  const ynabApi = new api(accessToken);
  const response = await ynabApi.payees.getPayees(id);

  if (response.data.payees) {
    const payees = response.data.payees;
    let saved: FilteredPayee[] = [];
    let transfer: FilteredPayee[] = [];
    payees.forEach((payee) => {
      if (!payee.deleted) {
        const filteredPayee: FilteredPayee = {
          id: payee.id,
          name: payee.name
        };
        if (payee.transfer_account_id) {
          filteredPayee.transfer_account_id = payee.transfer_account_id;
          filteredPayee.name = filteredPayee.name.split("Transfer : ")[1];
          transfer.push(filteredPayee);
        } else {
          saved.push(filteredPayee);
        }
      }
    });
    saved = saved.sort(sortPayees);
    transfer = transfer.sort(sortPayees);
    return [
      {
        name: "Saved Payees",
        items: saved
      },
      {
        name: "Payments and Transfers",
        items: transfer
      }
    ];
  } else {
    throw {
      id: "404",
      name: "not_found",
      detail: "Payees not found"
    };
  }
};

export const sortPayees = (a: FilteredPayee, b: FilteredPayee) => {
  const payeeA = a.name.toUpperCase();
  const payeeB = b.name.toUpperCase();
  if (payeeA < payeeB) {
    return -1;
  }
  if (payeeA > payeeB) {
    return 1;
  }
  return 0;
};

export const getCategories = async (
  id: string,
  accessToken: string,
  currencyFormat: CurrencyFormat
) => {
  const ynabApi = new api(accessToken);
  const response = await ynabApi.categories.getCategories(id);

  if (response.data.category_groups) {
    const groups = response.data.category_groups;
    let filteredGroups: Group[] = [];
    groups.forEach((group) => {
      const filteredCategories = filterCategories(group, currencyFormat);
      if (filteredCategories && filterCategories.length > 0) {
        filteredGroups.push({
          id: group.id,
          name: group.name,
          items: filteredCategories
        });
      }
    });
    filteredGroups = filteredGroups.sort(sortCategoryGroups);
    filteredGroups[0].name = "Inflow";
    return filteredGroups;
  } else {
    throw {
      id: "404",
      name: "not_found",
      detail: "Categories not found"
    };
  }
};

const filterCategories = (group: CategoryGroupWithCategories, currencyFormat: CurrencyFormat) => {
  const filteredCategories: FilteredCategory[] = [];
  if (!group.deleted && !group.hidden && group.name !== "Hidden Categories") {
    group.categories.forEach((category) => {
      if (group.name === "Internal Master Category") {
        if (category.name === "Inflow: Ready to Assign") {
          filteredCategories.push({
            id: category.id,
            name: "Ready to Assign"
          });
        }
      } else {
        if (!category.deleted && !category.hidden) {
          const filteredCategory = {
            id: category.id,
            name: category.name,
            balance: formatAmount(category.balance / 1000, currencyFormat)
          } as FilteredCategory;
          filteredCategories.push(filteredCategory);
        }
      }
    });
    return filteredCategories;
  }
};

export const sortCategoryGroups = (a: Group, b: Group) => {
  const categoryGroupA = a.name.toUpperCase();
  const categoryGroupB = b.name.toUpperCase();
  const internal = "Internal Master Category".toUpperCase();
  if (categoryGroupA === internal) {
    return -1;
  } else if (categoryGroupB === internal) {
    return 1;
  }
  return 0;
};

export const getBudgetSettings = async (id: string, accessToken: string) => {
  const ynabApi = new api(accessToken);
  const response = await ynabApi.budgets.getBudgetSettingsById(id);

  if (response.data.settings) {
    const settings = response.data.settings;
    return { ...settings };
  } else {
    throw {
      id: "404",
      name: "not_found",
      detail: "Settings not found"
    };
  }
};

const formatDecimals = (amount: number, currencyFormat: CurrencyFormat) => {
  const numberFormat = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: currencyFormat.decimal_digits,
    maximumFractionDigits: currencyFormat.decimal_digits
  });
  const formattedNumber = numberFormat.format(Math.abs(amount));
  return formattedNumber;
};

const formatAmount = (amount: number, currencyFormat: CurrencyFormat) => {
  const amountWithDecimals = formatDecimals(amount, currencyFormat);
  const symbol = currencyFormat.display_symbol ? currencyFormat.currency_symbol : "";
  const sign = Math.sign(Number(amount)) === -1 ? "-" : "";
  const formattedStr = currencyFormat.symbol_first
    ? `${sign}${symbol}${amountWithDecimals}`
    : `${sign}${amountWithDecimals}${symbol}`;
  return formattedStr;
};

export const mutateSubtransactions = (subtransactions: Subtransaction[]) => {
  return subtransactions.map((subtransaction) => {
    return {
      ...subtransaction,
      amount: subtransaction.amount * 1000
    };
  });
};
