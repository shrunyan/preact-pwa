import { h, render } from "preact";
import { Provider } from "unistore/preact";

import store from "./store";

import { Shell } from "./shell";

render(
  <Provider store={store}>
    <Shell />
  </Provider>,
  document.body
);
