import * as mobx from 'mobx';
import { decorate, observable, runInAction } from 'mobx';

import { User } from './user';

class Store {
  public isServer: boolean;

  public currentUser?: User = null;
  public currentUrl = '';

  constructor({
    initialState = {},
    isServer,
  }: {
    initialState?: any;
    isServer: boolean;
  }) {
    this.isServer = !!isServer;

    this.setCurrentUser(initialState.user);

    this.currentUrl = initialState.currentUrl || '';
  }

  public async setCurrentUser(user) {
    if (user) {
      this.currentUser = new User({ store: this, ...user });

    } else {
      this.currentUser = null;
    }
  }
}

decorate(Store, {
  currentUser: observable,
  currentUrl: observable,
});

let store: Store = null;

function initializeStore(initialState = {}) {
  const isServer = typeof window === 'undefined';

  const _store =
    store !== null && store !== undefined ? store : new Store({ initialState, isServer });

  // For SSG and SSR always create a new store
  if (typeof window === 'undefined') {
    return _store;
  }
  // Create the store once in the client
  if (!store) {
    store = _store;
  }

  console.log(_store);

  return _store;
}

function getStore() {
  return store;
}

export { Store, initializeStore, getStore };