# Sprout for YNAB Worker V2

This Cloudflare worker acts as the gateway between the Sprout for YNAB extension and YNAB's API for OAuth authentication and general functionality.

This unfinished version is a rewrite of the V1 worker.

## Install
```
npm run install
```

## Setup
### Client ID and Secret
- On https://app.ynab.com, go to Settings -> Developer Settings and create a new OAuth application. 
  - Do not enable default budget selection
  - Don't worry about adding redirect URI(s) at this point
- Save the app and set the client ID as `YNAB_CLIENT_ID` and secret as `YNAB_CLIENT_SECRET` as Cloudflare Environment Variables (save the client secret as a secret)
- Environments can be saved for local development in .dev.vars

### Worker URL
Replace `[WORKER_URL]` with the url for this worker

### Valid Origins
In wrangler.toml, a `VALID_ORIGINS` array holds a list of valid extension origin URLs to help whitelist the endpoints of the extension to prevent unauthorized access of the worker's endpoints.

## Run worker locally
```
npm run start
```
The app will run on port 8787.

## Deploy
### Staging
```
npm run deploy:staging
```
### Production
```
npm run deploy
```

## License
MIT