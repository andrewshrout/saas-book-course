/* eslint-disable @typescript-eslint/camelcase */

import * as _ from 'lodash';
import * as mongoose from 'mongoose';
import Stripe from 'stripe';

import { cancelSubscription } from '../stripe';

import sendEmail from '../aws-ses';
import { addToMailchimp } from '../mailchimp';
import { generateSlug } from '../utils/slugify';
import getEmailTemplate from './EmailTemplate';

import { getListOfInvoices } from '../stripe';

mongoose.set('useFindAndModify', false);

const mongoSchema = new mongoose.Schema({
  slug: {
    type: String,
    required: true,
    unique: true,
  },
  createdAt: {
    type: Date,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  displayName: String,
  avatarUrl: String,
  googleId: {
    type: String,
    unique: true,
    sparse: true,
  },
  googleToken: {
    accessToken: String,
    refreshToken: String,
  },
  isSignedupViaGoogle: {
    type: Boolean,
    required: true,
    default: false,
  },
  darkTheme: {
    type: Boolean,
  },
  stripeSubscription: {
    id: String,
    object: String,
    application_fee_percent: Number,
    billing: String,
    cancel_at_period_end: Boolean,
    billing_cycle_anchor: Number,
    canceled_at: Number,
    created: Number,
  },
  isSubscriptionActive: {
    type: Boolean,
    default: false,
  },
  isPaymentFailed: {
    type: Boolean,
    default: false,
  },
  stripeCustomer: {
    id: String,
    object: String,
    created: Number,
    currency: String,
    default_source: String,
    description: String,
  },
  stripeCard: {
    id: String,
    object: String,
    brand: String,
    funding: String,
    country: String,
    last4: String,
    exp_month: Number,
    exp_year: Number,
  },
  hasCardInformation: {
    type: Boolean,
    default: false,
  },
  stripeListOfInvoices: {
    object: String,
    has_more: Boolean,
    data: [
      {
        id: String,
        object: String,
        amount_paid: Number,
        created: Number,
        customer: String,
        subscription: String,
        hosted_invoice_url: String,
        billing: String,
        paid: Boolean,
        number: String,
        teamId: String,
        teamName: String,
      },
    ],
  },
});

export interface UserDocument extends mongoose.Document {
  slug: string;
  createdAt: Date;
  email: string;
  displayName: string;
  avatarUrl: string;
  googleId: string;
  googleToken: { accessToken: string; refreshToken: string };
  isSignedupViaGoogle: boolean;
  darkTheme: boolean;
  stripeSubscription: {
    id: string;
    object: string;
    application_fee_percent: number;
    billing: string;
    cancel_at_period_end: boolean;
    billing_cycle_anchor: number;
    canceled_at: number;
    created: number;
  };
  isSubscriptionActive: boolean;
  isPaymentFailed: boolean;
  stripeCustomer: {
    id: string;
    default_source: string;
    created: number;
    object: string;
    description: string;
  };
  stripeCard: {
    id: string;
    object: string;
    brand: string;
    country: string;
    last4: string;
    exp_month: number;
    exp_year: number;
    funding: string;
  };
  hasCardInformation: boolean;
  stripeListOfInvoices: {
    object: string;
    has_more: boolean;
    data: [
      {
        id: string;
        object: string;
        amount_paid: number;
        date: number;
        customer: string;
        subscription: string;
        hosted_invoice_url: string;
        billing: string;
        paid: boolean;
        number: string;
        teamId: string;
        teamName: string;
      },
    ];
  };
}

interface UserModel extends mongoose.Model<UserDocument> {
  getUserBySlug({ slug }: { slug: string }): Promise<UserDocument>;
  toggleTheme({ userId, darkTheme }: { userId: string; darkTheme: boolean }): Promise<void>;

  updateProfile({
    userId,
    name,
    avatarUrl,
  }: {
    userId: string;
    name: string;
    avatarUrl: string;
  }): Promise<UserDocument[]>;

  publicFields(): string[];

  signInOrSignUpViaGoogle({
    googleId,
    email,
    displayName,
    avatarUrl,
    googleToken,
  }: {
    googleId: string;
    email: string;
    displayName: string;
    avatarUrl: string;
    googleToken: { accessToken?: string; refreshToken?: string };
  }): Promise<UserDocument>;

  signInOrSignUpByPasswordless({
    uid,
    email,
  }: {
    uid: string;
    email: string;
  }): Promise<UserDocument>;

  subscribeUser({
    session,
    user,
  }: {
    session: Stripe.Checkout.Session;
    user: UserDocument;
  }): Promise<void>;

  cancelSubscription({ uid }: { uid: string }): Promise<UserDocument>;

  cancelSubscriptionAfterFailedPayment({
    subscriptionId,
  }: {
    subscriptionId: string;
  }): Promise<UserDocument>;

  saveStripeCustomerAndCard({
    user,
    session,
  }: {
    session: Stripe.Checkout.Session;
    user: UserDocument;
  }): Promise<void>;

  changeStripeCard({
    session,
    user,
  }: {
    session: Stripe.Checkout.Session;
    user: UserDocument;
  }): Promise<void>;

  getListOfInvoicesForCustomer({ userId }: { userId: string }): Promise<UserDocument>;
}

class UserClass extends mongoose.Model {
  public static async getUserBySlug({ slug }) {
    console.log('Static method: getUserBySlug');

    return this.findOne({ slug }, 'email displayName avatarUrl', { lean: true });
  }

  public static async updateProfile({ userId, name, avatarUrl }) {
    console.log('Static method: updateProfile');

    const user = await this.findById(userId, 'slug displayName');

    const modifier = { displayName: user.displayName, avatarUrl, slug: user.slug };

    //(user.slug);

    if (name !== user.displayName) {
      modifier.displayName = name;
      modifier.slug = await generateSlug(this, name);
    }

    return this.findByIdAndUpdate(userId, { $set: modifier }, { new: true, runValidators: true })
      .select('displayName avatarUrl slug')
      .setOptions({ lean: true });
  }

  public static publicFields(): string[] {
    return [
      '_id',
      'id',
      'displayName',
      'email',
      'avatarUrl',
      'slug',
      'isSignedupViaGoogle',
      'darkTheme',
      'stripeCard',
      'hasCardInformation',
      'stripeListOfInvoices',
    ];
  }

  public static async signInOrSignUpViaGoogle({
    googleId,
    email,
    displayName,
    avatarUrl,
    googleToken,
  }) {
    const user = await this.findOne({ email })
      .select([...this.publicFields(), 'googleId'].join(' '))
      .setOptions({ lean: true });

    if (user) {
      if (_.isEmpty(googleToken) && user.googleId) {
        return user;
      }

      const modifier = { googleId };
      if (googleToken.accessToken) {
        modifier['googleToken.accessToken'] = googleToken.accessToken;
      }

      if (googleToken.refreshToken) {
        modifier['googleToken.refreshToken'] = googleToken.refreshToken;
      }

      await this.updateOne({ email }, { $set: modifier });

      return user;
    }

    const slug = await generateSlug(this, displayName);

    const newUser = await this.create({
      createdAt: new Date(),
      googleId,
      email,
      googleToken,
      displayName,
      avatarUrl,
      slug,
      isSignedupViaGoogle: true,
    });

    const emailTemplate = await getEmailTemplate('welcome', { userName: displayName });

    if (!emailTemplate) {
      throw new Error('Welcome email template not found');
    }

    try {
      await sendEmail({
        from: `Kelly from saas-app.builderbook.org <${process.env.EMAIL_SUPPORT_FROM_ADDRESS}>`,
        to: [email],
        subject: emailTemplate.subject,
        body: emailTemplate.message,
      });
    } catch (err) {
      console.error('Email sending error:', err);
    }

    try {
      await addToMailchimp({ email, listName: 'signups' });
    } catch (error) {
      console.error('Mailchimp error:', error);
    }

    return _.pick(newUser, this.publicFields());
  }

  public static async signInOrSignUpByPasswordless({ uid, email }) {
    const user = await this.findOne({ email })
      .select(this.publicFields().join(' '))
      .setOptions({ lean: true });

    if (user) {
      throw Error('User already exists');
    }

    const slug = await generateSlug(this, email);

    const newUser = await this.create({
      _id: uid,
      createdAt: new Date(),
      email,
      slug,
    });

    const emailTemplate = await getEmailTemplate('welcome', { userName: email });

    if (!emailTemplate) {
      throw new Error('Email template "welcome" not found in database.');
    }

    try {
      await sendEmail({
        from: `Kelly from saas-app.builderbook.org <${process.env.EMAIL_SUPPORT_FROM_ADDRESS}>`,
        to: [email],
        subject: emailTemplate.subject,
        body: emailTemplate.message,
      });
    } catch (err) {
      console.error('Email sending error:', err);
    }

    try {
      await addToMailchimp({ email, listName: 'signups' });
    } catch (error) {
      console.error('Mailchimp error:', error);
    }

    return _.pick(newUser, this.publicFields());
  }

  public static toggleTheme({ userId, darkTheme }) {
    console.log('This came in');
    console.log(darkTheme);
    return this.updateOne({ _id: userId }, { darkTheme: !!darkTheme });
  }

  public static async subscribeUser({
    session,
    user,
  }: {
    session: Stripe.Checkout.Session;
    user: UserDocument;
  }) {
    if (!session.subscription) {
      throw new Error('Not subscribed');
    }

    if (!user) {
      throw new Error('User not found.');
    }

    if (user.isSubscriptionActive) {
      throw new Error('Team is already subscribed.');
    }

    const stripeSubscription = session.subscription as Stripe.Subscription;
    if (stripeSubscription.canceled_at) {
      throw new Error('Unsubscribed');
    }

    await this.updateOne({ _id: user._id }, { stripeSubscription, isSubscriptionActive: true });
  }

  public static async cancelSubscription({ uid }) {
    const user = await this.findById(uid).select('uId isSubscriptionActive stripeSubscription');

    if (!user.isSubscriptionActive) {
      throw new Error('User is already unsubscribed.');
    }

    //Add stripe here to cancel subscription?
    const cancelledSubscriptionObj = await cancelSubscription({
      subscriptionId: user.stripeSubscription.id,
    });

    return this.findByIdAndUpdate(
      uid,
      {
        stripeSubscription: cancelledSubscriptionObj,
        isSubscriptionActive: false,
      },
      { new: true, runValidators: true },
    )
      .select('isSubscriptionActive stripeSubscription')
      .setOptions({ lean: true });
  }

  public static async cancelSubscriptionAfterFailedPayment({ subscriptionId }) {
    const user: any = await this.find({ 'stripeSubscription.id': subscriptionId })
      .select('uid isSubscriptionActive stripeSubscription isPaymentFailed')
      .setOptions({ lean: true });
    if (!user.isSubscriptionActive) {
      throw new Error('User is already unsubscribed.');
    }
    if (user.isPaymentFailed) {
      throw new Error('User is already unsubscribed after failed payment.');
    }
    const cancelledSubscriptionObj = await cancelSubscription({
      subscriptionId,
    });
    return this.findByIdAndUpdate(
      user._id,
      {
        stripeSubscription: cancelledSubscriptionObj,
        isSubscriptionActive: false,
        isPaymentFailed: true,
      },
      { new: true, runValidators: true },
    )
      .select('isSubscriptionActive stripeSubscription isPaymentFailed')
      .setOptions({ lean: true });
  }
  public static async saveStripeCustomerAndCard({
    user,
    session,
  }: {
    session: Stripe.Checkout.Session;
    user: UserDocument;
  }) {
    if (!user) {
      throw new Error('User not found.');
    }

    const stripeSubscription = session.subscription as Stripe.Subscription;

    const stripeCard =
      (stripeSubscription.default_payment_method &&
        (stripeSubscription.default_payment_method as Stripe.PaymentMethod).card) ||
      undefined;

    const hasCardInformation = !!stripeCard;

    await this.updateOne(
      { _id: user._id },
      {
        stripeCustomer: session.customer,
        stripeCard,
        hasCardInformation,
      },
    );
  }
  public static async changeStripeCard({
    session,
    user,
  }: {
    session: Stripe.Checkout.Session;
    user: UserDocument;
  }): Promise<void> {
    if (!user) {
      throw new Error('User not found.');
    }

    const si: Stripe.SetupIntent = session.setup_intent as Stripe.SetupIntent;
    const pm: Stripe.PaymentMethod = si.payment_method as Stripe.PaymentMethod;

    if (!pm.card) {
      throw new Error('No card found.');
    }
    await this.updateOne({ _id: user._id }, { stripeCard: pm.card, hasCardInformation: true });
  }

  public static async getListOfInvoicesForCustomer({ userId }) {
    const user = await this.findById(userId, 'stripeCustomer');

    if (!user.stripeCustomer.id) {
      throw new Error('You are not a customer and you have no payment history.');
    }

    const newListOfInvoices = await getListOfInvoices({
      customerId: user.stripeCustomer.id,
    });

    if (newListOfInvoices.data === undefined || newListOfInvoices.data.length === 0) {
      throw new Error('You are a customer. But there is no payment history.');
    }

    const modifier = {
      stripeListOfInvoices: newListOfInvoices,
    };

    return this.findByIdAndUpdate(userId, { $set: modifier }, { new: true, runValidators: true })
      .select('stripeListOfInvoices')
      .setOptions({ lean: true });
  }
}

mongoSchema.loadClass(UserClass);

const User = mongoose.model<UserDocument, UserModel>('User', mongoSchema);

export default User;
