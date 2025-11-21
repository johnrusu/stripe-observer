require("dotenv").config();
const express = require("express");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const bodyParser = require("body-parser");
const cors = require("cors");

// constants
const { LAST_WEBHOOK_FILE_PATH } = require("./constants.js");

// file parser utils for saving/loading webhook data
const { parseDataToFile, getDataFromFile } = require("./fileparser.js");

const app = express();
const PORT = process.env.PORT || 4242;

// Middleware setup
app.use(cors());

// For webhook signature verification, we need the raw body
app.use("/webhook", bodyParser.raw({ type: "application/json" }));

// For other routes, use JSON parser
app.use(express.json());

// Webhook endpoint secret from environment
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Event processing handlers
const EventProcessors = {
  "payment_intent.created": (event) => {
    const paymentIntent = event.data.object;
    console.log("✅ Payment intent created:");
    console.log("Payment data", paymentIntent);
    console.log(`   Payment Intent ID: ${paymentIntent.id}`);
    console.log(
      `   Amount: $${paymentIntent.amount / 100} ${paymentIntent.currency}`
    );
    console.log(`   Customer: ${paymentIntent.customer || "Guest"}`);
  },

  "payment_intent.succeeded": (event) => {
    const paymentIntent = event.data.object;
    console.log(
      `✅ Payment succeeded for ${paymentIntent.amount / 100} ${
        paymentIntent.currency
      }`
    );
    console.log(`   Payment Intent ID: ${paymentIntent.id}`);
    console.log(`   Customer: ${paymentIntent.customer || "Guest"}`);

    // Add your business logic here
    // For example: update order status, send confirmation email, etc.
  },

  "payment_intent.payment_failed": (event) => {
    const paymentIntent = event.data.object;
    console.log(
      `❌ Payment failed for ${paymentIntent.amount / 100} ${
        paymentIntent.currency
      }`
    );
    console.log(`   Payment Intent ID: ${paymentIntent.id}`);
    console.log(
      `   Failure reason: ${
        paymentIntent.last_payment_error?.message || "Unknown"
      }`
    );

    // Add your business logic here
    // For example: notify customer, retry payment, etc.
  },

  "customer.created": (event) => {
    const customer = event.data.object;
    console.log(`👤 New customer created: ${customer.email || customer.id}`);
    console.log(`   Customer ID: ${customer.id}`);
    console.log(
      `   Created: ${new Date(customer.created * 1000).toISOString()}`
    );

    // Add your business logic here
    // For example: send welcome email, setup customer profile, etc.
  },

  "invoice.payment_succeeded": (event) => {
    const invoice = event.data.object;
    console.log(`📄 Invoice payment succeeded: ${invoice.number}`);
    console.log(`   Amount: ${invoice.amount_paid / 100} ${invoice.currency}`);
    console.log(`   Customer: ${invoice.customer}`);

    // Add your business logic here
    // For example: deliver subscription services, update account status, etc.
  },

  "checkout.session.completed": (event) => {
    const session = event.data.object;
    console.log(`🛒 Checkout session completed: ${session.id}`);
    console.log(`   Payment status: ${session.payment_status}`);
    console.log(
      `   Amount total: ${session.amount_total / 100} ${session.currency}`
    );

    // Add your business logic here
    // For example: fulfill order, send receipt, etc.
  },

  "subscription.created": (event) => {
    const subscription = event.data.object;
    console.log(`🔄 New subscription created: ${subscription.id}`);
    console.log(`   Customer: ${subscription.customer}`);
    console.log(`   Status: ${subscription.status}`);

    // Add your business logic here
    // For example: provision access, send welcome sequence, etc.
  },

  "subscription.updated": (event) => {
    const subscription = event.data.object;
    console.log(`🔄 Subscription updated: ${subscription.id}`);
    console.log(`   Status: ${subscription.status}`);
    console.log(
      `   Current period end: ${new Date(
        subscription.current_period_end * 1000
      ).toISOString()}`
    );

    // Add your business logic here
    // For example: update access level, handle downgrades/upgrades, etc.
  },

  "customer.subscription.deleted": (event) => {
    const subscription = event.data.object;
    console.log(`❌ Subscription cancelled: ${subscription.id}`);
    console.log(`   Customer: ${subscription.customer}`);
    console.log(
      `   Cancelled at: ${new Date(
        subscription.canceled_at * 1000
      ).toISOString()}`
    );

    // Add your business logic here
    // For example: revoke access, send feedback survey, etc.
  },
};

// Webhook endpoint
app.post("/webhook", (req, res) => {
  const sig = req.get("Stripe-Signature");

  let event;

  try {
    // Verify webhook signature using Stripe's library
    if (!endpointSecret) {
      console.warn(
        "⚠️  Warning: STRIPE_WEBHOOK_SECRET not set. Skipping signature verification."
      );
      // Parse event without verification (for testing only)
      event = JSON.parse(req.body);
    } else {
      // Verify the webhook signature
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
      console.log(`✅ Webhook signature verified for event: ${event.type}`);
    }
  } catch (err) {
    console.error(`❌ Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Log the received event
  console.log(`\n📨 Received event: ${event.type}`);
  console.log(`   Event ID: ${event.id}`);
  console.log(`   Created: ${new Date(event.created * 1000).toISOString()}`);
  console.log(`   Live mode: ${event.livemode}`);

  // Process the event
  try {
    const processor = EventProcessors[event.type];
    if (processor) {
      processor(event);
    } else {
      console.log(`ℹ️  Unhandled event type: ${event.type}`);
      // Log the event data for debugging
      console.log(`   Event data:`, JSON.stringify(event.data.object, null, 2));
    }
  } catch (processingError) {
    console.error(
      `❌ Error processing event ${event.type}:`,
      processingError.message
    );
    // Don't return an error response here - we successfully received the webhook
    // Log the error but return 200 so Stripe doesn't retry
  }

  // Save the last webhook event data to file
  parseDataToFile(LAST_WEBHOOK_FILE_PATH, event.data.object);

  // Return a 200 response to acknowledge receipt of the event
  res.json({ received: true, eventType: event.type, eventId: event.id });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    webhookSecretConfigured: !!endpointSecret,
  });
});

// Root endpoint with information
app.get("/", (req, res) => {
  res.json({
    message: "Stripe Webhook Observer is running!",
    endpoints: {
      webhook: "/webhook",
      health: "/health",
    },
    webhookSecretConfigured: !!endpointSecret,
    supportedEvents: Object.keys(EventProcessors),
  });
});

app.get("/last-webhook", (req, res) => {
  console.log("📂 Retrieving last webhook event from file...");
  const data = getDataFromFile(LAST_WEBHOOK_FILE_PATH);
  res.json(data);
});

app.get("/account", async (req, res) => {
  try {
    const account = await stripe.accounts.retrieve();
    res.json(account);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Stripe Webhook Observer listening on port ${PORT}`);
  console.log(`📡 Webhook endpoint: http://localhost:${PORT}/webhook`);
  console.log(`🔐 Webhook secret configured: ${!!endpointSecret}`);
  console.log(`\n📋 Supported event types:`);
  Object.keys(EventProcessors).forEach((eventType) => {
    console.log(`   - ${eventType}`);
  });
  console.log(`\n💡 To test with Stripe CLI:`);
  console.log(`   stripe listen --forward-to localhost:${PORT}/webhook`);
});

module.exports = app;
