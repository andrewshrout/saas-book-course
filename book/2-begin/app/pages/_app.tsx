import App from 'next/app';
import React from 'react';
import { themeLight, themeDark } from '../lib/theme';
import { ThemeProvider } from '@material-ui/core/styles';
import CssBaseline from '@material-ui/core/CssBaseline';

class MyApp extends App {
  public componentDidMount() {
    //Remove the server-side injected CSS.
    const jssStyles = document.querySelector('#jss-server-side');
    if (jssStyles && jssStyles.parentNode) {
      jssStyles.parentNode.removeChild(jssStyles);
    }
  }

  public render() {
    const { Component, pageProps } = this.props;
    console.log('rendered on the server');
    return (
      <ThemeProvider theme={false ? themeDark : themeLight}>
        <CssBaseline />
        <Component {...pageProps} />
      </ThemeProvider>
    );
  }
}

export default MyApp;
