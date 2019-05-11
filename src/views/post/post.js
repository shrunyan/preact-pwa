import { h, Component } from "preact";

import style from "./post.less";
export class Post extends Component {
  render(props, state) {
    return (
      <div class={style.Post}>
        <article class="demo-card-wide mdl-card mdl-shadow--2dp">
          <div class="mdl-card__title">
            <h2 class="mdl-card__title-text">Post One</h2>
          </div>
          <div class="mdl-card__supporting-text">POST DESCRIPTION</div>
          <div class="mdl-card__actions mdl-card--border">
            <a class="mdl-button mdl-button--colored mdl-js-button mdl-js-ripple-effect">
              Get Started
            </a>
          </div>
          <div class="mdl-card__menu">
            <button class="mdl-button mdl-button--icon mdl-js-button mdl-js-ripple-effect">
              <i class="material-icons">share</i>
            </button>
          </div>
        </article>
      </div>
    );
  }
}
