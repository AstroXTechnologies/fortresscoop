# Environment Variable Configuration Guide

## Problem

The error `TypeError: Invalid URL` with `'undefined/payments'` indicates that `process.env.FLW_ENDPOINT` is undefined when the PaymentService is initialized.

## Solutions

### 1. Check Environment Variables in Production

Make sure the following environment variables are set in your production environment (Render, Heroku, etc.):

```
FLW_ENDPOINT=https://api.flutterwave.com/v3
FLW_SECRET_KEY=FLWSECK_TEST-your-secret-key-here
FLW_PUBLIC_KEY=FLWPUBK_TEST-your-public-key-here
FLW_SECRET_HASH=your-secret-hash-here
```

### 2. For Render Deployment

1. Go to your Render dashboard
2. Select your backend service
3. Go to Environment tab
4. Add the environment variables listed above

### 3. For Local Testing

Create a `.env` file in the root of your backend project with:

```
PORT=3001
FLW_ENDPOINT=https://api.flutterwave.com/v3
FLW_SECRET_KEY=FLWSECK_TEST-your-secret-key
FLW_PUBLIC_KEY=FLWPUBK_TEST-your-public-key
FLW_SECRET_HASH=your-secret-hash
FRONTEND_URL=http://localhost:3000
```

### 4. Debug Steps

1. Run the debug script: `node debug-env.js`
2. Check the logs when starting the service
3. The PaymentService constructor now logs all environment variables

### 5. Alternative Configuration

If environment variables aren't working, you can hardcode the endpoint temporarily:

```typescript
private readonly baseUrl = 'https://api.flutterwave.com/v3';
```

### 6. Restart Requirements

After adding environment variables:

1. Restart your local development server
2. Redeploy your production service
3. Clear any cached builds

## Testing

The PaymentService constructor now includes detailed logging to help identify the issue.
