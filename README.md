# Stripe Webhook Observer

A Node.js application that receives and processes Stripe webhook events with proper signature verification. This observer handles common Stripe events and provides a foundation for building webhook-based integrations.

## Features

- ✅ **Signature Verification**: Validates webhook authenticity using Stripe's official library
- 🔄 **Event Processing**: Handles multiple Stripe event types with dedicated processors
- 📝 **Comprehensive Logging**: Detailed logging for debugging and monitoring
- 🛡️ **Error Handling**: Robust error handling with proper HTTP responses
- ⚡ **Easy Setup**: Simple configuration and deployment
- 🧪 **Testing Ready**: Compatible with Stripe CLI for local testing

## Supported Event Types

The observer currently handles these Stripe events:

- `payment_intent.succeeded` - Successful payments
- `payment_intent.payment_failed` - Failed payments
- `customer.created` - New customer creation
- `invoice.payment_succeeded` - Successful invoice payments
- `checkout.session.completed` - Completed checkout sessions
- `subscription.created` - New subscription creation
- `subscription.updated` - Subscription modifications
- `customer.subscription.deleted` - Subscription cancellations

## Prerequisites

1. **Node.js** (v14 or higher)
2. **Stripe Account** with API keys
3. **Stripe CLI** (for local testing)

## Installation

1. **Clone or download this project**

   ```bash
   cd stripe-observer
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your Stripe credentials:

   ```
   STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
   PORT=4242
   ```

## Getting Your Stripe Keys

### API Secret Key

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
2. Copy your **Secret key** (starts with `sk_test_` for test mode)
3. Add it to your `.env` file as `STRIPE_SECRET_KEY`

### Webhook Secret Key

#### Method 1: Using Stripe CLI (Recommended for local testing)

1. Install [Stripe CLI](https://stripe.com/docs/stripe-cli)
2. Login to your Stripe account:
   ```bash
   stripe login
   ```
3. Start the webhook listener:
   ```bash
   stripe listen --forward-to localhost:4242/webhook
   ```
4. Copy the webhook signing secret from the CLI output (starts with `whsec_`)
5. Add it to your `.env` file as `STRIPE_WEBHOOK_SECRET`

#### Method 2: Using Stripe Dashboard (For production)

1. Go to [Stripe Dashboard Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Enter your webhook URL (e.g., `https://yourdomain.com/webhook`)
4. Select the events you want to receive
5. Copy the "Signing secret" from the webhook details
6. Add it to your `.env` file as `STRIPE_WEBHOOK_SECRET`

## Usage

### Starting the Server

```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:4242` (or your configured PORT).

### Testing with Stripe CLI

1. **Start your webhook observer**:

   ```bash
   npm run dev
   ```

2. **In another terminal, start Stripe CLI forwarding**:

   ```bash
   stripe listen --forward-to localhost:4242/webhook
   ```

3. **Trigger test events**:

   ```bash
   # Test a successful payment
   stripe trigger payment_intent.succeeded

   # Test a failed payment
   stripe trigger payment_intent.payment_failed

   # Test customer creation
   stripe trigger customer.created

   # Test invoice payment
   stripe trigger invoice.payment_succeeded

   # Test checkout completion
   stripe trigger checkout.session.completed
   ```

### Testing Specific Events

To forward only specific events (recommended for focused testing):

```bash
stripe listen --events payment_intent.succeeded,customer.created,invoice.payment_succeeded --forward-to localhost:4242/webhook
```

## API Endpoints

### `POST /webhook`

The main webhook endpoint that receives Stripe events.

**Headers Required:**

- `Stripe-Signature`: Webhook signature for verification

**Response:**

```json
{
  "received": true,
  "eventType": "payment_intent.succeeded",
  "eventId": "evt_1234567890"
}
```

### `GET /health`

Health check endpoint for monitoring.

**Response:**

```json
{
  "status": "OK",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "webhookSecretConfigured": true
}
```

### `GET /`

Root endpoint with service information.

**Response:**

```json
{
  "message": "Stripe Webhook Observer is running!",
  "endpoints": {
    "webhook": "/webhook",
    "health": "/health"
  },
  "webhookSecretConfigured": true,
  "supportedEvents": ["payment_intent.succeeded", "..."]
}
```

### `GET /account`

Retrieves the Stripe account information.

**Response:**

```json
{
  "id": "acct_1234567890",
  "object": "account",
  "business_profile": {
    "name": "Your Business Name",
    "url": "https://yourbusiness.com"
  },
  "country": "US",
  "email": "business@example.com",
  "type": "standard",
  "created": 1234567890,
  "default_currency": "usd"
}
```

**Error Response:**

```json
{
  "error": "Error message if account retrieval fails"
}
```

### `GET /last-webhook`

Retrieves the data from the last received webhook event.

**Response:**

Returns the data object from the most recent webhook event that was processed and saved to file.

```json
{
  "id": "pi_1234567890",
  "object": "payment_intent",
  "amount": 2999,
  "currency": "usd",
  "status": "succeeded",
  "created": 1234567890,
  "customer": "cus_1234567890"
}
```

## Security

### Webhook Signature Verification

This application implements Stripe's recommended security practices:

1. **Signature Verification**: Uses `stripe.webhooks.constructEvent()` to verify webhook authenticity
2. **Raw Body Processing**: Preserves the raw request body required for signature verification
3. **Secret Protection**: Webhook secrets are stored in environment variables
4. **Error Handling**: Proper error responses for invalid signatures

### Example Verification Process

```javascript
try {
  // Verify the webhook signature
  const event = stripe.webhooks.constructEvent(
    req.body, // Raw body
    sig, // Stripe-Signature header
    endpointSecret // Your webhook secret
  );
  console.log("✅ Webhook signature verified");
} catch (err) {
  console.error("❌ Webhook signature verification failed:", err.message);
  return res.status(400).send(`Webhook Error: ${err.message}`);
}
```

## Customizing Event Handlers

Add or modify event processors in the `EventProcessors` object:

```javascript
const EventProcessors = {
  "your.custom.event": (event) => {
    const data = event.data.object;
    console.log("Processing custom event:", data);

    // Your business logic here
    // - Update database
    // - Send notifications
    // - Trigger other services
  },
};
```

## Error Handling

The application includes comprehensive error handling:

- **Signature Verification Failures**: Returns 400 status with error details
- **Event Processing Errors**: Logged but don't fail the webhook (returns 200)
- **JSON Parsing Errors**: Returns 400 status for malformed payloads
- **Unhandled Events**: Logged with event details for debugging

## Monitoring and Logging

### Log Formats

```
✅ Webhook signature verified for event: payment_intent.succeeded
📨 Received event: payment_intent.succeeded
   Event ID: evt_1234567890
   Created: 2024-01-01T12:00:00.000Z
   Live mode: false
✅ Payment succeeded for 29.99 usd
   Payment Intent ID: pi_1234567890
   Customer: cus_1234567890
```

### Health Monitoring

Monitor the `/health` endpoint to ensure the service is running:

```bash
curl http://localhost:4242/health
```

## Production Deployment

### Environment Setup

1. Set production environment variables:

   ```
   STRIPE_SECRET_KEY=sk_live_your_live_secret_key
   STRIPE_WEBHOOK_SECRET=whsec_your_production_webhook_secret
   PORT=4242
   ```

2. Ensure HTTPS is enabled (required for production webhooks)

3. Configure your webhook endpoint in Stripe Dashboard with your production URL

### Best Practices

1. **Use HTTPS**: Stripe requires HTTPS for production webhooks
2. **Monitor Logs**: Set up log monitoring and alerting
3. **Handle Duplicates**: Implement idempotency keys for critical operations
4. **Return Quickly**: Process events asynchronously for complex operations
5. **Retry Logic**: Implement retry mechanisms for external service calls

## Troubleshooting

### Common Issues

1. **Signature Verification Failing**

   - Check that `STRIPE_WEBHOOK_SECRET` matches your endpoint secret
   - Ensure the raw body is preserved (don't use `express.json()` before the webhook route)
   - Verify the Stripe-Signature header is being sent

2. **Events Not Received**

   - Check that your server is running and accessible
   - Verify the webhook URL in Stripe Dashboard
   - Check firewall and network settings

3. **Timeout Errors**
   - Ensure your webhook handler returns quickly (< 10 seconds)
   - Move complex processing to background jobs

### Debugging

Enable debug logging by setting:

```
DEBUG=stripe-observer
```

Check webhook delivery status in the [Stripe Dashboard](https://dashboard.stripe.com/webhooks).

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add your changes with tests
4. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Resources

- [Stripe Webhooks Documentation](https://stripe.com/docs/webhooks)
- [Stripe CLI Documentation](https://stripe.com/docs/stripe-cli)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Webhook Security Best Practices](https://stripe.com/docs/webhooks/best-practices)
