import CssBaseline from '@material-ui/core/CssBaseline';
import { ThemeProvider } from '@material-ui/styles';
import { Provider } from 'mobx-react';
import App from 'next/app';
import React from 'react';


import { isMobile } from '../lib/isMobile';
import { themeDark, themeLight } from '../lib/theme';
import { getUserApiMethod } from '../lib/api/public';
import { getStore, initializeStore, Store } from '../lib/store';


class MyApp extends App<{ isMobile: boolean }> {
  public static async getInitialProps({ Component, ctx }) {
    let firstGridItem = true;

    if (ctx.pathname.includes('/login')) {
      firstGridItem = false;
    }

    const pageProps = { isMobile: isMobile({ req: ctx.req }), firstGridItem };

    if (Component.getInitialProps) {
      Object.assign(pageProps, await Component.getInitialProps(ctx));
    }

    const appProps = { pageProps };

    if (getStore()) {
      return appProps;
    }

    const { req } = ctx;

    const headers: any = {};
    if (req.headers && req.headers.cookie) {
      headers.cookie = req.headers.cookie;
    }

    let userObj = null;
    try {
      const { user } = await getUserApiMethod({ headers});
      userObj = user;
    } catch (error) {
      console.log(error);
    }

    return {
      ...appProps,
      initialState: { user: userObj, currentUrl: ctx.asPath },
    };
  }

  public componentDidMount() {
    // Remove the server-side injected CSS.
    const jssStyles = document.querySelector('#jss-server-side');
    if (jssStyles && jssStyles.parentNode) {
      jssStyles.parentNode.removeChild(jssStyles);
    }
  }

  private store: Store;

  constructor(props) {
    console.log('MyApp.constructor')
    super(props);

    this.store = initializeStore(props.initialState)
  }
  public render() {
    const { Component, pageProps } = this.props;
    const store = this.store;

    return (
      <ThemeProvider theme={false ? themeDark : themeLight}>
        <CssBaseline />
        <Provider store={store}>
        <Component {...pageProps} />
        </Provider>
      </ThemeProvider>
    );
  }
}

export default MyApp;
