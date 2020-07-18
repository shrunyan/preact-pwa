import { h, Component } from "preact";
import Router from "preact-router";
import cx from "classnames";

import { AppNav } from "../components/app-nav";
import { AppHeader } from "../components/app-header";
import { AppFooter } from "../components/app-footer";

import { NotFound } from "../views/not-found";
import { Home } from "../views/home";
import { Post } from "../views/post";

import style from "./shell.less";
export class Shell extends Component {
  /** Gets fired when the route changes.
   *	@param {Object} event		"change" event from [preact-router](http://git.io/preact-router)
   *	@param {string} event.url	The newly routed URL
   */
  handleRoute = (e) => {
    this.currentUrl = e.url;
  };

  render(props, state, store) {
    console.log("Shell:render", props, state, store);
    return (
      <section class={cx(style.Shell, "mdl-layout mdl-js-layout")}>
        <AppHeader />
        <div class="mdl-layout__drawer">
          <span class="mdl-layout-title">Title</span>
          <AppNav />
        </div>
        <main class="mdl-layout__content">
          <Router onChange={this.handleRoute}>
            <Home path="/" />
            <Post path="/posts/:id" />
            <NotFound default />
          </Router>
          <button
            class={cx(
              style.AddPost,
              "mdl-button mdl-js-button mdl-button--fab mdl-js-ripple-effect mdl-button--colored"
            )}
          >
            <i class="material-icons">menu</i>
          </button>

          {/* <!-- Right aligned menu below button --> */}
          <button
            id="menu-lower-right"
            class={cx(
              style.AppMenuBtn,
              "mdl-button mdl-js-button mdl-button--fab mdl-js-ripple-effect mdl-button--colored"
            )}
          >
            <i class="material-icons">more_vert</i>
          </button>

          <div class={style.AppMenu}>
            <ul
              class={cx(
                "mdl-menu mdl-menu--top-right mdl-js-menu mdl-js-ripple-effect"
              )}
              for="menu-lower-right"
            >
              <li class="mdl-menu__item">Some Action</li>
              <li class="mdl-menu__item">Another Action</li>
              <li disabled class="mdl-menu__item">
                Disabled Action
              </li>
              <li class="mdl-menu__item">Yet Another Action</li>
            </ul>
          </div>

          <AppFooter />
        </main>
      </section>
    );
  }
}
