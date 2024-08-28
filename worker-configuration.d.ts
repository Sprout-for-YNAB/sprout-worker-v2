import { TransactionFlagColor } from "ynab";

type Env = {
  LEVEL: "local" | "staging" | "production";
  VALID_ORIGINS: string[];
  YNAB_CLIENT_ID: string;
  YNAB_CLIENT_SECRET: string;
};

type YnabErrorResponse = {
  error: YnabError;
};

type OauthResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  created_at: number;
};

type ErrorObj = {
  error: string;
  error_description: string;
};

type TransactionRequest = {
  id: string;
  transaction: Transaction;
};

type FilteredAccount = {
  id: string;
  name: string;
  balance?: string;
};

type FilteredPayee = {
  id: string;
  name: string;
  transfer_account_id?: string;
};

type FilteredCategory = {
  id: string;
  name: string;
  balance?: string;
};

type Group = {
  id: string;
  name: string;
  items: Category[];
};

type YnabError = {
  id: string;
  name: string;
  detail: string;
};

type Transaction = {
  account_id: string;
  date: string;
  amount: number;
  payee_id?: string;
  payee_name?: string;
  category_id?: string;
  memo?: string;
  cleared: boolean;
  flag_color: TransactionFlagColor | null;
  subtransactions?: Subtransaction[];
};

type Subtransaction = {
  amount: number;
  payee_id?: string;
  payee_name?: string;
  category_id?: string;
  category_name?: string;
  memo?: string;
};
