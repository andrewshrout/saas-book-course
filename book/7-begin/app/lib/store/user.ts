import { action, decorate, observable, runInAction } from 'mobx';

import {
  toggleThemeApiMethod,
  updateProfileApiMethod,
  getListOfInvoicesApiMethod,
  cancelSubscriptionApiMethod,
} from '../api/team-member';
import { Store } from './index';

class User {
  public store: Store;

  public _id: string;
  public slug: string;
  public email: string | null;
  public displayName: string | null;
  public avatarUrl: string | null;
  public isSignedupViaGoogle: boolean;

  public darkTheme = false;

  public stripeSubscription: {
    id: string;
    object: string;
    application_fee_percent: number;
    billing: string;
    cancel_at_period_end: boolean;
    billing_cycle_anchor: number;
    canceled_at: number;
    created: number;
  };
  public isSubscriptionActive: boolean;
  public isPaymentFailed: boolean;

  public stripeCard: {
    brand: string;
    funding: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
  public hasCardInformation: boolean;
  public stripeListOfInvoices: {
    object: string;
    data: [
      {
        amount_paid: number;
        teamName: string;
        created: number;
        hosted_invoice_url: string;
      },
    ];
    has_more: boolean;
  };

  constructor(params) {
    this.store = params.store;
    this._id = params._id;
    this.slug = params.slug;
    this.email = params.email;
    this.displayName = params.displayName;
    this.avatarUrl = params.avatarUrl;
    this.isSignedupViaGoogle = !!params.isSignedupViaGoogle;
    this.darkTheme = !!params.darkTheme;

    this.stripeSubscription = params.stripeSubscription;
    this.isSubscriptionActive = params.isSubscriptionActive;
    this.isPaymentFailed = params.isPaymentFailed;

    this.stripeCard = params.stripeCard;
    this.hasCardInformation = params.hasCardInformation;
    this.stripeListOfInvoices = params.stripeListOfInvoices;
  }

  public async updateProfile({ name, avatarUrl }: { name: string; avatarUrl: string }) {
    console.log(name);
    const { updatedUser } = await updateProfileApiMethod({
      name,
      avatarUrl,
    });
    console.log(updatedUser);
    runInAction(() => {
      this.displayName = updatedUser.displayName;
      this.avatarUrl = updatedUser.avatarUrl;
      this.slug = updatedUser.slug;
    });
  }

  public async toggleTheme(darkTheme: boolean) {
    await toggleThemeApiMethod({ darkTheme });
    runInAction(() => {
      this.darkTheme = darkTheme;
    });
    window.location.reload();
  }
  //public async checkIfMustBeCustomer() {
  //  let ifMustBeCustomerOnClient: boolean;

  /*
    This is a sample example. Insert our logic here, return false so that the value on the page does not render / return / load.
    If it returns false, use notify to alert the user to their error.
    if (this && this.memberIds.length < 2) {
      ifTeamLeaderMustBeCustomerOnClient = false;
    } else if (this && this.memberIds.length >= 2 && this.isSubscriptionActive) {
      ifTeamLeaderMustBeCustomerOnClient = false;
    } else if (this && this.memberIds.length >= 2 && !this.isSubscriptionActive) {
      ifTeamLeaderMustBeCustomerOnClient = true;
    }
  
    return ifTeamLeaderMustBeCustomerOnClient;
    */
  //}

  public async getListOfInvoices() {
    try {
      const { stripeListOfInvoices } = await getListOfInvoicesApiMethod();
      runInAction(() => {
        this.stripeListOfInvoices = stripeListOfInvoices;
      });
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  public async cancelSubscription({ uid }: { uid: string }) {
    try {
      const { isSubscriptionActive } = await cancelSubscriptionApiMethod({ uid });

      runInAction(() => {
        this.isSubscriptionActive = isSubscriptionActive;
      });
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
}

decorate(User, {
  slug: observable,
  email: observable,
  displayName: observable,
  avatarUrl: observable,
  darkTheme: observable,

  updateProfile: action,
  toggleTheme: action,
  getListOfInvoices: action,

  stripeCard: observable,
  stripeListOfInvoices: observable,

  stripeSubscription: observable,
  isSubscriptionActive: observable,
  isPaymentFailed: observable,
});

export { User };
