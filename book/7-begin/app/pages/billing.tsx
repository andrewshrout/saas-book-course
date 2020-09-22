import { observer } from 'mobx-react';
import moment from 'moment';
import Head from 'next/head';
import * as React from 'react';
import { loadStripe } from '@stripe/stripe-js';
import Button from '@material-ui/core/Button';
import NProgress from 'nprogress';

import Layout from '../components/layout';
import notify from '../lib/notify';
import { Store } from '../lib/store';
import withAuth from '../lib/withAuth';
import { fetchCheckoutSessionApiMethod } from '../lib/api/team-member';

const dev = process.env && process.env.NODE_ENV && process.env.NODE_ENV !== 'production';

const stripePromise = loadStripe(
  dev ? process.env.STRIPE_TEST_PUBLISHABLEKEY : process.env.STRIPE_LIVE_PUBLISHABLEKEY,
);

type Props = {
  store: Store;
  isMobile: boolean;
  teamSlug: string;
  redirectMessage?: string;
};

type State = { disabled: boolean; showInvoices: boolean };

class Billing extends React.Component<Props, State> {
  public state = { disabled: false, showInvoices: false };

  public render() {
    const { store, isMobile } = this.props;
    const { currentUser } = store;

    return (
      <Layout {...this.props}>
        <Head>
          <title>{currentUser.displayName}'s Billing</title>
        </Head>
        <div style={{ padding: isMobile ? '0px' : '0px 30px' }}>
          <h3>Your Billing</h3>
          <p />
          <h4 style={{ marginTop: '40px' }}>Paid plan</h4>
          {this.renderSubscriptionButton()}
          <p />
          <br />
          <h4>Card information</h4>
          {this.renderCardInfo()}
          <p />
          <br />
          <h4>Payment history</h4>
          <Button
            variant="outlined"
            color="primary"
            onClick={this.showListOfInvoicesOnClick}
            disabled={this.state.disabled}
          >
            Show payment history
          </Button>
          <p />
          {this.renderInvoices()}
          <p />
          <br />
        </div>
      </Layout>
    );
  }

  public async componentDidMount() {
    if (this.props.redirectMessage) {
      notify(this.props.redirectMessage);
    }
  }

  private renderSubscriptionButton() {
    const { currentUser } = this.props.store;

    let subscriptionDate;
    let billingDay;
    if (currentUser && currentUser.stripeSubscription) {
      subscriptionDate = moment(currentUser.stripeSubscription.billing_cycle_anchor * 1000).format(
        'MMM Do YYYY',
      );
      billingDay = moment(currentUser.stripeSubscription.billing_cycle_anchor * 1000).format('Do');
    }

    if (currentUser && !currentUser.isSubscriptionActive && currentUser.isPaymentFailed) {
      return (
        <>
          <p>You are not a paying customer.</p>
          <Button
            variant="contained"
            color="primary"
            onClick={() => this.handleCheckoutClick('subscription')}
            disabled={this.state.disabled}
          >
            Buy subscription
          </Button>
          <p />
          <p>
            You were automatically unsubscribed due to failed payment. You will be prompt to update
            card information if you choose to re-subscribe.
          </p>
        </>
      );
    } else if (currentUser && !currentUser.isSubscriptionActive && !currentUser.isPaymentFailed) {
      return (
        <React.Fragment>
          <p>You are not a paying customer.</p>
          <p>
            Buy subscription using your current card, see below section for current card
            information.
          </p>
          <Button
            variant="contained"
            color="primary"
            onClick={() => this.handleCheckoutClick('subscription')}
            disabled={this.state.disabled}
          >
            Buy subscription
          </Button>
        </React.Fragment>
      );
    } else {
      return (
        <React.Fragment>
          <span>
            {' '}
            <i className="material-icons" color="action" style={{ verticalAlign: 'text-bottom' }}>
              done
            </i>{' '}
            Subscription is active.
            <p>
              <b>{currentUser.displayName}</b> subscribed on <b>{subscriptionDate}</b>.
            </p>
            <p>
              You will be billed $50 on <b>{billingDay} day</b> of each month unless you cancel
              subscription or subscription is cancelled automatically due to failed payment.
            </p>
          </span>
          <p />
          <Button
            variant="outlined"
            color="primary"
            onClick={this.cancelSubscriptionOnClick}
            disabled={this.state.disabled}
          >
            Unsubscribe User
          </Button>
          <br />
        </React.Fragment>
      );
    }
  }

  private handleCheckoutClick = async (mode: 'subscription' | 'setup') => {
    try {
      const { currentUser } = this.props.store;

      NProgress.start();
      this.setState({ disabled: true });

      const { sessionId } = await fetchCheckoutSessionApiMethod({ mode, uid: currentUser._id });

      // When the customer clicks on the button, redirect them to Checkout.
      const stripe = await stripePromise;
      const { error } = await stripe.redirectToCheckout({ sessionId });

      if (error) {
        notify(error);
        console.error(error);
      }
    } catch (err) {
      notify(err);
      console.error(err);
    } finally {
      this.setState({ disabled: false });
      NProgress.done();
    }
  };

  private cancelSubscriptionOnClick = async () => {
    const { currentUser } = this.props.store;

    NProgress.start();
    this.setState({ disabled: true });

    try {
      await currentUser.cancelSubscription({ uid: currentUser._id });
      notify('Success!');
    } catch (err) {
      notify(err);
    } finally {
      this.setState({ disabled: false });
      NProgress.done();
    }
  };

  private renderCardInfo() {
    const { currentUser } = this.props.store;

    if (currentUser && currentUser.hasCardInformation) {
      return (
        <span>
          {' '}
          <i className="material-icons" color="action" style={{ verticalAlign: 'text-bottom' }}>
            done
          </i>{' '}
          Your default payment method:
          <li>
            {currentUser.stripeCard.brand}, {currentUser.stripeCard.funding} card
          </li>
          <li>Last 4 digits: *{currentUser.stripeCard.last4}</li>
          <li>
            Expiration: {currentUser.stripeCard.exp_month}/{currentUser.stripeCard.exp_year}
          </li>
          <p />
          <Button
            variant="outlined"
            color="primary"
            onClick={() => this.handleCheckoutClick('setup')}
            disabled={this.state.disabled}
          >
            Update card
          </Button>
        </span>
      );
    } else {
      return 'You have not added a card.';
    }
  }

  private renderInvoices() {
    const { currentUser } = this.props.store;
    const { showInvoices } = this.state;

    if (!showInvoices) {
      return null;
    }

    if (currentUser && currentUser.stripeCard) {
      return (
        <React.Fragment>
          {currentUser.stripeListOfInvoices.data.map((invoice, i) => (
            <React.Fragment key={i}>
              <p>Your history of payments:</p>
              <li>
                ${invoice.amount_paid / 100} was paid on{' '}
                {moment(invoice.created * 1000).format('MMM Do YYYY')} for '{invoice.teamName}' -{' '}
                <a href={invoice.hosted_invoice_url} target="_blank" rel="noopener noreferrer">
                  See invoice
                </a>
              </li>
            </React.Fragment>
          ))}
        </React.Fragment>
      );
    } else {
      return 'You have no history of payments.';
    }
  }

  private showListOfInvoicesOnClick = async () => {
    const { currentUser } = this.props.store;
    NProgress.start();
    this.setState({ disabled: true });
    try {
      await currentUser.getListOfInvoices();
      this.setState({ showInvoices: true });
    } catch (err) {
      notify(err);
    } finally {
      this.setState({ disabled: false });
      NProgress.done();
    }
  };
}

export default withAuth(observer(Billing));
