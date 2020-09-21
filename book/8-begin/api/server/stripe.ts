/* eslint-disable @typescript-eslint/camelcase */

import * as bodyParser from 'body-parser';
import Stripe from 'stripe';

import Team from './models/Team';
import User from './models/User';

const dev = process.env.NODE_ENV !== 'production';

const stripeInstance = new Stripe(
  dev ? process.env.STRIPE_TEST_SECRETKEY : process.env.STRIPE_LIVE_SECRETKEY,
  { apiVersion: '2020-03-02' },
);

function createSession({ userId, teamId, teamSlug, customerId, subscriptionId, userEmail, mode }) {
  const params: Stripe.Checkout.SessionCreateParams = {
    customer_email: customerId ? undefined : userEmail,
    customer: customerId,
    payment_method_types: ['card'],
    mode,
    success_url: `${process.env.URL_API}/stripe/checkout-completed/{CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.URL_APP}/team/${teamSlug}/billing?redirectMessage=Checkout%20canceled`,
    metadata: { userId, teamId },
  };

  if (mode === 'subscription') {
    params.line_items = [
      {
        price: dev ? process.env.STRIPE_TEST_PRICEID : process.env.STRIPE_LIVE_PRICEID,
        quantity: 1,
      },
    ];
  } else if (mode === 'setup') {
    if (!customerId || !subscriptionId) {
      throw new Error('customerId and subscriptionId required');
    }

    params.setup_intent_data = {
      metadata: { customer_id: customerId, subscription_id: subscriptionId },
    };
  }

  return stripeInstance.checkout.sessions.create(params);
}

function retrieveSession({ sessionId }: { sessionId: string }) {
  return stripeInstance.checkout.sessions.retrieve(sessionId, {
    expand: [
      'setup_intent',
      'setup_intent.payment_method',
      'customer',
      'subscription',
      'subscription.default_payment_method',
    ],
  });
}

function updateCustomer(customerId, params: Stripe.CustomerUpdateParams) {
  console.log('updating customer', customerId);
  return stripeInstance.customers.update(customerId, params);
}

function updateSubscription(subscriptionId: string, params: Stripe.SubscriptionUpdateParams) {
  console.log('updating subscription', subscriptionId);
  return stripeInstance.subscriptions.update(subscriptionId, params);
}

function cancelSubscription({ subscriptionId }) {
  console.log('cancel subscription', subscriptionId);
  return stripeInstance.subscriptions.del(subscriptionId);
}

function getListOfInvoices({ customerId }) {
  console.log('getting list of invoices for customer', customerId);
  return stripeInstance.invoices.list({ customer: customerId, limit: 100 });
}
