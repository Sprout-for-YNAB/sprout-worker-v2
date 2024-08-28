import { api, CurrencyFormat, SaveSubTransaction, SaveTransaction } from "ynab";
import {
  getAndFilterAccounts,
  getPayees,
  getCategories,
  getBudgetSettings,
  mutateSubtransactions
} from "./lib/budget";
import { TransactionRequest, YnabError } from "../worker-configuration";
import { sendError } from "./lib/errors";

export const getBudgets = async (responseHeaders: Headers, accessToken: string) => {
  try {
    const ynabApi = new api(accessToken);
    const ynabResponse = await ynabApi.budgets.getBudgets();
    const budgets = ynabResponse.data.budgets;
    const responseObj = budgets.map((budget) => {
      return {
        id: budget.id,
        name: budget.name
      };
    });
    return new Response(JSON.stringify(responseObj), {
      headers: responseHeaders,
      status: 200
    });
  } catch (err) {
    const { error } = err as { error: YnabError };
    console.error("getBudgets error", error);
    const { id, detail } = error;
    return sendError(detail, id);
  }
};

export const getBudget = async (responseHeaders: Headers, accessToken: string, id: string) => {
  try {
    const settings = await getBudgetSettings(id, accessToken);
    const currencyFormat = settings.currency_format ?? ({} as CurrencyFormat);
    const [accounts, payees, categoryGroups] = await Promise.all([
      getAndFilterAccounts(id, accessToken, currencyFormat),
      getPayees(id, accessToken),
      getCategories(id, accessToken, currencyFormat)
    ]);

    const response = {
      accounts,
      payees,
      categoryGroups,
      settings
    };
    return new Response(JSON.stringify(response), {
      headers: responseHeaders,
      status: 200
    });
  } catch (err) {
    const { error } = err as { error: YnabError };
    console.error("getBudget error", error);
    const { id, detail } = error;
    return sendError(detail, id);
  }
};

export const sendTransaction = async (
  request: Request,
  responseHeaders: Headers,
  accessToken: string
) => {
  try {
    const { id, transaction }: TransactionRequest = await request.json();
    const ynabTransaction = {
      ...transaction,
      approved: true,
      amount: transaction.amount * 1000,
      cleared: transaction.cleared ? "cleared" : "uncleared",
      subtransactions: mutateSubtransactions(
        transaction.subtransactions ?? []
      ) as SaveSubTransaction[]
    } as SaveTransaction;
    const ynabApi = new api(accessToken);
    await ynabApi.transactions.createTransaction(id, {
      transaction: ynabTransaction
    });

    return new Response(null, {
      headers: responseHeaders,
      status: 204
    });
  } catch (err) {
    const { error } = err as { error: YnabError };
    console.error("sendTransaction error", error);
    const { id, detail } = error;
    return sendError(detail, id);
  }
};
