;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
XPaneComponent = Ember.Component.extend({
  didInsertElement: function() {
    this.get('parentView').addPane(this);
  },

  selected: function() {
    return this.get('parentView.selected') === this;
  }.property('parentView.selected')
});

module.exports = XPaneComponent;

},{}],2:[function(require,module,exports){
XTabsComponent = Ember.Component.extend({
  init: function() {
    this._super.apply(this, arguments);
    this.panes = [];
  },

  addPane: function(pane) {
    if (this.get('panes.length') == 0) this.select(pane);
    this.panes.pushObject(pane);
  },

  select: function(pane) {
    this.set('selected', pane);
  }
});

module.exports = XTabsComponent;

},{}],3:[function(require,module,exports){
App = Ember.Application.create({
  rootElement : "#main-application"
});

App.animateModalClose = function() {
  var promise = new Ember.RSVP.defer();

  $('body').removeClass("fullscreen-open");
  promise.resolve();


  return promise.promise;
};

App.animateModalOpen = function() {
  var promise = new Ember.RSVP.defer();

   $('body').addClass("fullscreen-open");
  promise.resolve();
  

  return promise.promise;
};

Ember.TextSupport.reopen({
  attributeBindings: ["data-stripe", "autocomplete", "autocompletetype", "required"]
});

App.CvcField = Ember.TextField.extend({
  required: true,
  autocompletetype: "cc-csc",
  format: "123",
  placeholder: Ember.computed.alias("format"),
  autocomplete: "off",
  didInsertElement: function() {
    return this.$().payment("formatCardCVC");
  }
});

App.CardNumberField = Ember.TextField.extend({
  required: true,
  autocompletetype: "cc-number",
  format: "1234 5678 9012 3456",
  placeholder: Ember.computed.alias("format"),
  didInsertElement: function() {
    return this.$().payment("formatCardNumber");
  }
});

App.CardExpiryField = Ember.TextField.extend({
  required: true,
  autocompletetype: "cc-exp",
  format: "MM / YY",
  placeholder: Ember.computed.alias("format"),
  didInsertElement: function() {
    return this.$().payment("formatCardExpiry");
  }
});

App.CouponCodeField = Ember.TextField.extend({
  required: false,
  format: "CODE",
  placeholder: Ember.computed.alias("format"),
  change: function() {
    var controller;
    controller = this.get('targetObject');
    return controller.send('couponChanged');
  }
});

App.CouponCheckbox = Ember.Checkbox.extend({
  required: false
});

module.exports = App;

},{}],4:[function(require,module,exports){
var App = require('./app');

App.Router.map(function(){
  this.resource("profile", { path: "/:profile_id" });
});

},{"./app":3}],5:[function(require,module,exports){
AccountController = Ember.ObjectController.extend({
  needs: ["purchaseForm","cancelForm", "updateCard", "applyCoupon"],  
  couponCode: function(){
    return this.get("model.details.discount.coupon.id");
  }.property("model.details.discount","model.details.discount.coupon", "model.details.discount.coupon.id"),
  actions: {
    purchase: function (model) {
      var org = this.get("model.details.org");
      var details = this.get('model.details');
      plan = Ember.Object.create({plan: model, org:org, details: details})
      this.set("controllers.purchaseForm.model", plan)
      this.send("openModal","purchaseForm")
    },
    updateCard: function (model) {
      var org = this.get("model.details.org");
      card = Ember.Object.create({card: model, org:org})
      this.set("controllers.updateCard.model", card)
      this.send("openModal","updateCard")
    },
    cancel: function (model) {
      var org = this.get("model.details.org");
      var details = this.get('model.details');
      plan = Ember.Object.create({plan: model, org:org, details: details})
      this.set("controllers.cancelForm.model", plan)
      this.send("openModal","cancelForm")
    
    },
    applyCoupon: function (model) {
      this.set("controllers.applyCoupon.model", model)
      this.send("openModal","applyCoupon");
    }
  }  
});

module.exports = AccountController;

},{}],6:[function(require,module,exports){
ApplicationController = Ember.Controller.extend();

module.exports = ApplicationController;

},{}],7:[function(require,module,exports){
require("./coupon_controller");

ApplyCouponController = Ember.ObjectController.extend(CouponController, {
  coupon: null,
  customer: Ember.computed.alias('model.details.card.customer'),
  isDisabled: (function() {
    return this.get('errors') || this.get('processingAction');
  }).property('errors'),
  actions: {
    apply_coupon: function() {
      var coupon_id, customer;
      coupon_id = this.get('coupon');
      customer = this.get('customer');
      this.set('processingAction', true);
      return this.ajax("/settings/redeem_coupon/" + customer, {
        coupon: coupon_id
      }, "PUT").then(this.didAcceptCoupon.bind(this), this.didRejectCoupon.bind(this));
    },
    couponChanged: function() {
      var coupon_id, success;
      coupon_id = this.get('coupon');
      if (coupon_id === "") {
        return this.clearCouponAlerts();
      }
      return this.ajax("/settings/coupon_valid/" + coupon_id, {}, "GET").then(success = (function() {}), this.didRejectCoupon.bind(this));
    },
    close: function() {
      return this.send("closeModal");
    }
  }
});

module.exports = ApplyCouponController

},{"./coupon_controller":9}],8:[function(require,module,exports){
CancelFormController = Ember.Controller.extend({
  processingAction: false,
  actions: {
    close: function() {
      return this.send("closeModal");
    },
    cancel: function() {
      this.set('processingAction', true);
      return this.ajax("/settings/profile/" + this.get("model.org.login") + "/plans/" + this.get('model.plan.id'), {}).then(this.didCancel.bind(this), this.cancelDidError.bind(this));
    }
  },
  didCancel: function() {
    this.set('model.details.has_plan', false);
    this.set('model.details.discount', null);
    this.set('processingAction', false);
    this.set("model.plan.purchased", false);
    this.set("model.details.card", null);
    return this.send("closeModal");
  },
  cancelDidError: function(error) {
    this.set('errors', error.responseJSON.error.message);
    return this.set('processingAction', false);
  },
  ajax: function(url, data) {
    var controller;
    controller = this;
    return new Ember.RSVP.Promise(function(resolve, reject) {
      var hash;
      hash = {};
      hash.url = url;
      hash.type = 'DELETE';
      hash.context = controller;
      hash.data = data;
      hash.success = function(json) {
        return resolve(json);
      };
      hash.error = function(jqXHR, textStatus, errorThrown) {
        return reject(jqXHR);
      };
      return Ember.$.ajax(hash);
    });
  }
});

module.exports = CancelFormController;

},{}],9:[function(require,module,exports){
CouponController = Ember.Mixin.create({
  processingAction: false,
  onCouponChange: (function() {
    var errors;
    errors = this.get('errors');
    if (errors) {
      return this.set('errors', null);
    }
  }).observes('coupon'),
  ajax: function(url, data, verb) {
    var controller;
    controller = this;
    return new Ember.RSVP.Promise(function(resolve, reject) {
      var hash;
      hash = {};
      hash.url = url;
      hash.type = verb || 'GET';
      hash.context = controller;
      hash.data = data;
      hash.success = function(json) {
        return resolve(json);
      };
      hash.error = function(jqXHR, textStatus, errorThrown) {
        return reject(jqXHR);
      };
      return Ember.$.ajax(hash);
    });
  },
  didRejectCoupon: function(error, statusText) {
    this.set('errors', JSON.parse(error.responseText).error.message);
    return this.set('processingAction', false);
  },
  didAcceptCoupon: function(response) {
    this.send('close');
    this.set('processingAction', false);
    return this.set('model.details.discount', response.discount);
  },
  clearCouponAlerts: function() {
    return this.set('errors', null);
  }  
});

module.exports = CouponController;

},{}],10:[function(require,module,exports){
CreditCardForm = Ember.Controller.extend({
  actions: {
    close: function() {
      return this.send("closeModal");
    }
  },
  key: HuboardEnv.stripe_pub_key,
  processingCard: false,
  number: null,
  cvc: null,
  exp: null,
  expMonth: (function() {
    if (this.get("exp")) {
      return Ember.$.payment.cardExpiryVal(this.get("exp")).month || "MM";
    }
    return "MM";
  }).property("exp"),
  expYear: (function() {
    if (this.get("exp")) {
      return Ember.$.payment.cardExpiryVal(this.get("exp")).year || "YYYY";
    }
    return "YYYY";
  }).property("exp"),
  cardType: (function() {
    return Ember.$.payment.cardType(this.get('number'));
  }).property('number'),
  process: function() {
    this.set('processingCard', true);
    Stripe.setPublishableKey(this.get('key'));
    return Stripe.card.createToken({
      number: this.get('number'),
      cvc: this.get('cvc'),
      exp_month: this.get('expMonth'),
      exp_year: this.get('expYear')
    }, this.didProcessToken.bind(this));
  }
});

module.exports = CreditCardForm;

},{}],11:[function(require,module,exports){
HistoryController = Ember.ObjectController.extend({
  actions: {
    saveAdditionalInfo: function (model) {
      controller = this;
      controller.set("processing", true);
      return new Ember.RSVP.Promise(function(resolve, reject){
        Ember.$.ajax({
          url: "/settings/profile/" + model.get("login") + "/additionalInfo",
          type: "PUT",
          data: {
            additional_info: model.get("history.additional_info")
          },
          success: function(response){
            resolve(response);
            controller.set("processing", false);
          },
          error: function(response){
            reject(response);
            controller.set("processing", false);
          }
        })
      })
    }
  }
});

module.exports = HistoryController;

},{}],12:[function(require,module,exports){
require("./credit_card_form_controller");

PurchaseFormController =  CreditCardForm.extend({
  coupon: null,
  isDisabled: (function() {
    return this.get("isProcessing") || this.get('errors');
  }).property("isProcessing", "errors"),
  onCouponChange: (function() {
    var errors;
    errors = this.get('errors');
    if (errors) {
      return this.set('errors', null);
    }
  }).observes('coupon'),
  price: (function() {
    return this.get("model.amount");
  }).property("plan.amount"),
  didProcessToken: function(status, response) {
    if (response.error) {
      this.set('processingCard', false);
      return this.set('errors', response.error.message);
    } else {
      return this.postCharge(response);
    }
  },
  postCharge: function(token) {
    return this.ajax("/settings/charge/" + this.get("model.org.login"), {
      email: this.get("model.org.billing_email"),
      card: token,
      coupon: this.get("coupon"),
      plan: this.get("model.plan")
    }).then(this.didPurchase.bind(this), this.purchaseDidError.bind(this));
  },
  didPurchase: function(response) {
    this.set('processingCard', false);
    this.set("model.plan.purchased", true);
    this.set("model.details.card", response.card);
    this.set('model.details.discount', response.discount);
    this.set('model.details.has_plan', true);
    return this.send("close");
  },
  purchaseDidError: function(error) {
    this.set('errors', JSON.parse(error.responseText).error.message);
    return this.set('processingCard', false);
  },
  didRejectCoupon: function(error, statusText) {
    return this.set('errors', JSON.parse(error.responseText).error.message);
  },
  clearCouponAlerts: function() {
    return this.set('errors', null);
  },
  ajax: function(url, data, verb) {
    var controller;
    controller = this;
    return new Ember.RSVP.Promise(function(resolve, reject) {
      var hash;
      hash = {};
      hash.url = url;
      hash.type = verb || 'POST';
      hash.context = controller;
      hash.data = data;
      hash.success = function(json) {
        return resolve(json);
      };
      hash.error = function(jqXHR, textStatus, errorThrown) {
        return reject(jqXHR);
      };
      return Ember.$.ajax(hash);
    });
  },
  actions: {
    couponChanged: function() {
      var coupon_id, success;
      coupon_id = this.get('coupon');
      if (coupon_id === "") {
        return this.clearCouponAlerts();
      }
      return this.ajax("/settings/coupon_valid/" + coupon_id, {}, "GET").then(success = (function() {}), this.didRejectCoupon.bind(this));
    }
  }
});

module.exports = PurchaseFormController;

},{"./credit_card_form_controller":10}],13:[function(require,module,exports){
require("./credit_card_form_controller");

UpdateCardController = CreditCardForm.extend({
  didProcessToken: function(status, response) {
    if (response.error) {
      this.set('processingCard', false);
      return this.set('errors', response.error.message);
    } else {
      this.set('errors', "");
      return this.postUpdate(response);
    }
  },
  postUpdate: function(token) {
    return this.ajax("/settings/profile/" + this.get("model.org.login") + "/card", {
      email: this.get("model.org.billing_email"),
      card: token
    }).then(this.didUpdate.bind(this));
  },
  didUpdate: function(response) {
    this.set('processingCard', false);
    this.set('model.card.details.card', response.card);
    return this.send("close");
  },
  ajax: function(url, data) {
    var controller;
    controller = this;
    return new Ember.RSVP.Promise(function(resolve, reject) {
      var hash;
      hash = {};
      hash.url = url;
      hash.type = 'PUT';
      hash.context = controller;
      hash.data = data;
      hash.success = function(json) {
        return resolve(json);
      };
      hash.error = function(jqXHR, textStatus, errorThrown) {
        return reject(jqXHR);
      };
      return Ember.$.ajax(hash);
    });
  } 
});

module.exports = UpdateCardController;

},{"./credit_card_form_controller":10}],14:[function(require,module,exports){
Handlebars.registerHelper("stripe-money", function(path) {
  var value = Ember.getPath(this, path);
  return "$" + parseFloat(value/100).toFixed(0);
});

Handlebars.registerHelper("stripe-date", function(path) {
  var value = Ember.getPath(this, path);
  var date = new Date(value * 1000);
  return date.toDateString();
});

window.stripe_pub_key = '<%= ENV["STRIPE_PUBLISHABLE_API"] %>'

},{}],15:[function(require,module,exports){
// This file is auto-generated by `ember build`.
// You should not modify it.

var App = window.App = require('./config/app');
require('./templates');
require('./helpers/stripe');


App.XPaneComponent = require('./components/x_pane_component');
App.XTabsComponent = require('./components/x_tabs_component');
App.AccountController = require('./controllers/account_controller');
App.ApplicationController = require('./controllers/application_controller');
App.ApplyCouponController = require('./controllers/apply_coupon_controller');
App.CancelFormController = require('./controllers/cancel_form_controller');
App.CouponController = require('./controllers/coupon_controller');
App.CreditCardFormController = require('./controllers/credit_card_form_controller');
App.HistoryController = require('./controllers/history_controller');
App.PurchaseFormController = require('./controllers/purchase_form_controller');
App.UpdateCardController = require('./controllers/update_card_controller');
App.Org = require('./models/org');
App.User = require('./models/user');
App.ApplicationRoute = require('./routes/application_route');
App.IndexRoute = require('./routes/index_route');
App.LoadingRoute = require('./routes/loading_route');
App.ProfileRoute = require('./routes/profile_route');
App.ApplyCouponView = require('./views/apply_coupon_view');
App.CancelFormView = require('./views/cancel_form_view');
App.LoadingView = require('./views/loading_view');
App.ModalView = require('./views/modal_view');
App.PurchaseFormView = require('./views/purchase_form_view');
App.UpdateCardView = require('./views/update_card_view');

require('./config/routes');

module.exports = App;


},{"./components/x_pane_component":1,"./components/x_tabs_component":2,"./config/app":3,"./config/routes":4,"./controllers/account_controller":5,"./controllers/application_controller":6,"./controllers/apply_coupon_controller":7,"./controllers/cancel_form_controller":8,"./controllers/coupon_controller":9,"./controllers/credit_card_form_controller":10,"./controllers/history_controller":11,"./controllers/purchase_form_controller":12,"./controllers/update_card_controller":13,"./helpers/stripe":14,"./models/org":16,"./models/user":17,"./routes/application_route":18,"./routes/index_route":19,"./routes/loading_route":20,"./routes/profile_route":21,"./templates":22,"./views/apply_coupon_view":23,"./views/cancel_form_view":24,"./views/loading_view":25,"./views/modal_view":26,"./views/purchase_form_view":27,"./views/update_card_view":28}],16:[function(require,module,exports){
Org = Ember.Object.extend({
  gravatar_url : function() {
    return this.get("avatar_url") 

  }.property("avatar_url"),

  loadDetails : function () {
    var org = this; 
    return Em.Deferred.promise(function(p) {
      p.resolve($.getJSON("/api/profiles/"+ org.get("login")).then(function (response) {
        org.set("details", response)
        return response;
      }));
    });
  },
  loadHistory : function () {
    var org = this; 
    return Em.Deferred.promise(function(p) {
      p.resolve($.getJSON("/api/profiles/"+ org.get("login") + "/history").then(function (response) {
        org.set("history", response)
        return response;
      }));
    });
  }
});

module.exports = Org;

},{}],17:[function(require,module,exports){
User = Ember.Object.extend({
  gravatar_url : function() {
    return this.get("avatar_url")

  }.property("avatar_url"),

  loadDetails : function () {
    var user = this; 
    return Em.Deferred.promise(function(p) {
      p.resolve($.getJSON("/api/profiles/user").then(function (response) {
        user.set("details", response)
        return response;
      }));
    });
  },
  loadHistory : function () {
    var user = this; 
    return Em.Deferred.promise(function(p) {
      p.resolve($.getJSON("/api/profiles/"+ user.get("login") + "/history").then(function (response) {
        user.set("history", response)
        return response;
      }));
    });
  }
});

module.exports = User;

},{}],18:[function(require,module,exports){
var ApplicationRoute = Ember.Route.extend({
  actions: {
    openModal: function (view){
      this.render(view, {
        into: "application",
        outlet: "modal"
      })
    },
    closeModal: function() {
      App.animateModalClose().then(function() {
        this.render('empty', {
          into: 'application',
          outlet: 'modal'
        });
      }.bind(this));
    }
  },

  model : function () {
    return Em.Deferred.promise(function(p) {
      Ember.run.once(function() {
        $.getJSON("/api/profiles").then(function(response) {

          var user = App.User.create(response.user);

          var orgs = Em.A();

          response.orgs.forEach(function(org) {
            orgs.pushObject(App.Org.create(org));
          });

          p.resolve(Ember.Object.create({
            user : user,
            orgs : orgs
          }));


        });
      });
    });
  }
});

module.exports = ApplicationRoute;

},{}],19:[function(require,module,exports){
IndexRoute = Ember.Route.extend({
  model : function () {
    var model = this.modelFor("application");
    return model.user;
  },

  afterModel: function (model) {
    return model.loadDetails().then(function(){
      return model.loadHistory();
    });
  }
});

module.exports = IndexRoute;

},{}],20:[function(require,module,exports){
var LoadingRoute = Ember.Route.extend({
  renderTemplate: function() {
    if(this.router._activeViews.application){
      return this.render({ "into" : "application", "outlet" : "loading"});
    }
    this.render("loading");
  }
});

module.exports = LoadingRoute;

},{}],21:[function(require,module,exports){
ProfileRoute = Ember.Route.extend({
  model: function(params) {

    var profiles = this.modelFor("application");
    return profiles.orgs.find(function(item) {
      return item.login == params.profile_id;                   
    });

  },
  serialize: function (model) {
    return { profile_id: model.get("login")}
  },

  afterModel : function (model) {
    return model.loadDetails().then(function(){
      return model.loadHistory();
    });
  }
});

module.exports = ProfileRoute;

},{}],22:[function(require,module,exports){

Ember.TEMPLATES['account'] = Ember.Handlebars.template(function anonymous(Handlebars,depth0,helpers,partials,data) {
this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Ember.Handlebars.helpers); data = data || {};
  var buffer = '', stack1, hashTypes, hashContexts, escapeExpression=this.escapeExpression, helperMissing=helpers.helperMissing, self=this;

function program1(depth0,data) {
  
  var buffer = '', hashTypes, hashContexts;
  data.buffer.push("\n     <img src=\"<%= image_path 'Plain.png' %>\" /> <strong>Credit card on file.</strong> Ending in ");
  hashTypes = {};
  hashContexts = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "model.details.card.last4", {hash:{},contexts:[depth0],types:["ID"],hashContexts:hashContexts,hashTypes:hashTypes,data:data})));
  data.buffer.push("\n     <button style=\"float: right\" ");
  hashTypes = {};
  hashContexts = {};
  data.buffer.push(escapeExpression(helpers.action.call(depth0, "updateCard", "", {hash:{},contexts:[depth0,depth0],types:["ID","ID"],hashContexts:hashContexts,hashTypes:hashTypes,data:data})));
  data.buffer.push(" class=\"hb-button small\">Update card</button>\n    ");
  return buffer;
  }

function program3(depth0,data) {
  
  
  data.buffer.push("\n     <img src=\"<%= image_path 'Plain.png' %>\" /> <strong>No Credit card on file.</strong>\n\n    ");
  }

function program5(depth0,data) {
  
  var buffer = '', stack1, hashContexts, hashTypes;
  data.buffer.push("\n      <img src=\"<%= image_path 'icn-coupon.png' %>\" /> <strong> Coupon: ");
  hashContexts = {'unescaped': depth0};
  hashTypes = {'unescaped': "STRING"};
  stack1 = helpers._triageMustache.call(depth0, "couponCode", {hash:{
    'unescaped': ("true")
  },contexts:[depth0],types:["ID"],hashContexts:hashContexts,hashTypes:hashTypes,data:data});
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push(" </strong>\n    <button style=\"float: right\"class=\"hb-button small\"\n    ");
  hashTypes = {};
  hashContexts = {};
  data.buffer.push(escapeExpression(helpers.action.call(depth0, "applyCoupon", "", {hash:{},contexts:[depth0,depth0],types:["ID","ID"],hashContexts:hashContexts,hashTypes:hashTypes,data:data})));
  data.buffer.push("> Redeem Coupon </button>\n    ");
  return buffer;
  }

function program7(depth0,data) {
  
  var buffer = '', stack1, stack2, hashTypes, hashContexts, options;
  data.buffer.push("\n      <tr>\n        <td>");
  hashTypes = {};
  hashContexts = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "name", {hash:{},contexts:[depth0],types:["ID"],hashContexts:hashContexts,hashTypes:hashTypes,data:data})));
  data.buffer.push("</td>\n        <td>");
  hashTypes = {};
  hashContexts = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashContexts:hashContexts,hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers['stripe-money'] || depth0['stripe-money']),stack1 ? stack1.call(depth0, "amount", options) : helperMissing.call(depth0, "stripe-money", "amount", options))));
  data.buffer.push("/month</td>\n        <td>unlimited</td>\n        <td>unlimited</td>\n        <td class=\"text-right\">    \n         ");
  hashTypes = {};
  hashContexts = {};
  stack2 = helpers['if'].call(depth0, "purchased", {hash:{},inverse:self.program(10, program10, data),fn:self.program(8, program8, data),contexts:[depth0],types:["ID"],hashContexts:hashContexts,hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n\n        </td>\n      </tr>\n\n      ");
  return buffer;
  }
function program8(depth0,data) {
  
  var buffer = '', hashTypes, hashContexts;
  data.buffer.push(" \n            Your plan\n            <button class=\"hb-button hb-button-danger small\"\n               ");
  hashTypes = {};
  hashContexts = {};
  data.buffer.push(escapeExpression(helpers.action.call(depth0, "cancel", "", {hash:{},contexts:[depth0,depth0],types:["ID","ID"],hashContexts:hashContexts,hashTypes:hashTypes,data:data})));
  data.buffer.push(">Cancel plan</button>\n          ");
  return buffer;
  }

function program10(depth0,data) {
  
  var buffer = '', hashTypes, hashContexts;
  data.buffer.push("\n            <button class=\"hb-button small\"\n             ");
  hashTypes = {};
  hashContexts = {};
  data.buffer.push(escapeExpression(helpers.action.call(depth0, "purchase", "", {hash:{},contexts:[depth0,depth0],types:["ID","ID"],hashContexts:hashContexts,hashTypes:hashTypes,data:data})));
  data.buffer.push(">Upgrade</button>\n          ");
  return buffer;
  }

  data.buffer.push("<div class=\"alert alert-success\">\n  <p>\n    <strong>All plans</strong> receive a <strong>15 day free trial</strong>.\n  </p>\n  <p>\n    Risk free, cancel at anytime before the trial ends and receive no charges.\n  </p>\n</div>\n\n<div class='account-details'>\n  <div class='credit-card'>\n    ");
  hashTypes = {};
  hashContexts = {};
  stack1 = helpers['if'].call(depth0, "model.details.card", {hash:{},inverse:self.program(3, program3, data),fn:self.program(1, program1, data),contexts:[depth0],types:["ID"],hashContexts:hashContexts,hashTypes:hashTypes,data:data});
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push("\n  </div>\n\n  <div class='coupon'>\n    ");
  hashTypes = {};
  hashContexts = {};
  stack1 = helpers['if'].call(depth0, "model.details.has_plan", {hash:{},inverse:self.noop,fn:self.program(5, program5, data),contexts:[depth0],types:["ID"],hashContexts:hashContexts,hashTypes:hashTypes,data:data});
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push("\n  </div>\n</div>\n\n <div class=\"table-wrapper\">\n  <table class=\"table\">\n    <thead>\n      <th>Plan</th>\n      <th>Price</th>\n      <th>Private repositories</th>\n      <th>Collaborators</th>\n      <th></th>\n    </head>\n    <tbody>\n\n      ");
  hashTypes = {};
  hashContexts = {};
  stack1 = helpers.each.call(depth0, "model.details.plans", {hash:{},inverse:self.noop,fn:self.program(7, program7, data),contexts:[depth0],types:["ID"],hashContexts:hashContexts,hashTypes:hashTypes,data:data});
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push("\n    </tbody>\n  </table>\n</div>\n");
  return buffer;
  
});

Ember.TEMPLATES['apply_coupon'] = Ember.Handlebars.template(function anonymous(Handlebars,depth0,helpers,partials,data) {
this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Ember.Handlebars.helpers); data = data || {};
  var buffer = '', stack1, hashContexts, hashTypes, options, escapeExpression=this.escapeExpression, self=this, helperMissing=helpers.helperMissing;

function program1(depth0,data) {
  
  var buffer = '', hashTypes, hashContexts;
  data.buffer.push("\n        <div class=\"alert alert-error\">");
  hashTypes = {};
  hashContexts = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "errors", {hash:{},contexts:[depth0],types:["ID"],hashContexts:hashContexts,hashTypes:hashTypes,data:data})));
  data.buffer.push("</div>\n      ");
  return buffer;
  }

function program3(depth0,data) {
  
  
  data.buffer.push("\n        <div class=\"fullscreen-overlay\">\n        </div>\n      ");
  }

  data.buffer.push("<div class=\"fullscreen-credit-card\">\n  <form ");
  hashContexts = {'on': depth0};
  hashTypes = {'on': "ID"};
  data.buffer.push(escapeExpression(helpers.action.call(depth0, "apply_coupon", {hash:{
    'on': ("submit")
  },contexts:[depth0],types:["ID"],hashContexts:hashContexts,hashTypes:hashTypes,data:data})));
  data.buffer.push(">\n    <div class=\"modal-header\">\n      <div>\n        <button type=\"button\" class=\"close\" ");
  hashTypes = {};
  hashContexts = {};
  data.buffer.push(escapeExpression(helpers.action.call(depth0, "close", {hash:{},contexts:[depth0],types:["ID"],hashContexts:hashContexts,hashTypes:hashTypes,data:data})));
  data.buffer.push(" data-dismiss=\"modal\" aria-hidden=\"true\">×</button>\n        Redeem a Coupon! \n      </div>\n    </div>\n    <div class=\"modal-body\">\n      <div class=\"form-row full\">\n        <p> (applied against your next invoice of greater than $0.00) </p>\n          <label>\n            Coupon:\n          </label>\n         ");
  hashContexts = {'valueBinding': depth0};
  hashTypes = {'valueBinding': "STRING"};
  data.buffer.push(escapeExpression(helpers.view.call(depth0, "App.CouponCodeField", {hash:{
    'valueBinding': ("coupon")
  },contexts:[depth0],types:["ID"],hashContexts:hashContexts,hashTypes:hashTypes,data:data})));
  data.buffer.push("\n      </div>\n      ");
  hashTypes = {};
  hashContexts = {};
  stack1 = helpers['if'].call(depth0, "errors", {hash:{},inverse:self.noop,fn:self.program(1, program1, data),contexts:[depth0],types:["ID"],hashContexts:hashContexts,hashTypes:hashTypes,data:data});
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push("\n      ");
  hashTypes = {};
  hashContexts = {};
  stack1 = helpers['if'].call(depth0, "processingAction", {hash:{},inverse:self.noop,fn:self.program(3, program3, data),contexts:[depth0],types:["ID"],hashContexts:hashContexts,hashTypes:hashTypes,data:data});
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push("\n    </div>\n    <div class=\"modal-footer\">\n      <button href=\"#\" class=\"stripe-connect light-blue\" type=\"submit\" ");
  hashContexts = {'disabled': depth0};
  hashTypes = {'disabled': "STRING"};
  options = {hash:{
    'disabled': ("isDisabled")
  },contexts:[],types:[],hashContexts:hashContexts,hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.bindAttr || depth0.bindAttr),stack1 ? stack1.call(depth0, options) : helperMissing.call(depth0, "bindAttr", options))));
  data.buffer.push("><span> Redeem </span></button>\n    </div>\n  </form>\n</div>\n");
  return buffer;
  
});

Ember.TEMPLATES['cancel_form'] = Ember.Handlebars.template(function anonymous(Handlebars,depth0,helpers,partials,data) {
this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Ember.Handlebars.helpers); data = data || {};
  var buffer = '', stack1, hashContexts, hashTypes, options, escapeExpression=this.escapeExpression, self=this, helperMissing=helpers.helperMissing;

function program1(depth0,data) {
  
  
  data.buffer.push("\n        <div class=\"fullscreen-overlay\">\n        </div>\n      ");
  }

  data.buffer.push("<div class=\"fullscreen-credit-card\">\n  <form ");
  hashContexts = {'on': depth0};
  hashTypes = {'on': "ID"};
  data.buffer.push(escapeExpression(helpers.action.call(depth0, "cancel", {hash:{
    'on': ("submit")
  },contexts:[depth0],types:["ID"],hashContexts:hashContexts,hashTypes:hashTypes,data:data})));
  data.buffer.push(">\n    <div class=\"modal-header\">\n      <button type=\"button\" class=\"close\" ");
  hashTypes = {};
  hashContexts = {};
  data.buffer.push(escapeExpression(helpers.action.call(depth0, "close", {hash:{},contexts:[depth0],types:["ID"],hashContexts:hashContexts,hashTypes:hashTypes,data:data})));
  data.buffer.push(" data-dismiss=\"modal\" aria-hidden=\"true\">×</button>\n      Cancel plan\n    </div>\n    <div class=\"modal-body\">\n      <p>\n        By cancelling your subscription you will not be billed again and your account will be suspended immediately.\n      </p>\n      <p> \n        We'd hate to see you go, are you sure you want to cancel?\n      </p>\n\n      <p>\n        If you have any questions, <a href=\"mailto:support@huboard.com?subject=Cancel subscription\">contact us</a> anytime.\n      </p>\n\n      ");
  hashTypes = {};
  hashContexts = {};
  stack1 = helpers['if'].call(depth0, "processingAction", {hash:{},inverse:self.noop,fn:self.program(1, program1, data),contexts:[depth0],types:["ID"],hashContexts:hashContexts,hashTypes:hashTypes,data:data});
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push("\n    </div>\n    <div class=\"modal-footer\">\n      <button href=\"#\" class=\"hb-button danger full\" type=\"submit\" ");
  hashContexts = {'disabled': depth0};
  hashTypes = {'disabled': "STRING"};
  options = {hash:{
    'disabled': ("processingAction")
  },contexts:[],types:[],hashContexts:hashContexts,hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.bindAttr || depth0.bindAttr),stack1 ? stack1.call(depth0, options) : helperMissing.call(depth0, "bindAttr", options))));
  data.buffer.push("><span>Cancel my plan</span></button>\n    </div>\n  </form>\n</div>\n");
  return buffer;
  
});

Ember.TEMPLATES['history'] = Ember.Handlebars.template(function anonymous(Handlebars,depth0,helpers,partials,data) {
this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Ember.Handlebars.helpers); data = data || {};
  var buffer = '', stack1, stack2, hashContexts, hashTypes, options, escapeExpression=this.escapeExpression, helperMissing=helpers.helperMissing, self=this;

function program1(depth0,data) {
  
  var buffer = '', stack1, stack2, hashTypes, hashContexts, options;
  data.buffer.push("\n      <tr>\n        <td>");
  hashTypes = {};
  hashContexts = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashContexts:hashContexts,hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers['stripe-date'] || depth0['stripe-date']),stack1 ? stack1.call(depth0, "created", options) : helperMissing.call(depth0, "stripe-date", "created", options))));
  data.buffer.push("</td>\n        <td>");
  hashTypes = {};
  hashContexts = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "receipt_email", {hash:{},contexts:[depth0],types:["ID"],hashContexts:hashContexts,hashTypes:hashTypes,data:data})));
  data.buffer.push("</td>\n        <td>");
  hashTypes = {};
  hashContexts = {};
  options = {hash:{},contexts:[depth0],types:["ID"],hashContexts:hashContexts,hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers['stripe-money'] || depth0['stripe-money']),stack1 ? stack1.call(depth0, "amount", options) : helperMissing.call(depth0, "stripe-money", "amount", options))));
  data.buffer.push("</td>\n        <td class=\"text-right\">    \n         ");
  hashTypes = {};
  hashContexts = {};
  stack2 = helpers['if'].call(depth0, "paid", {hash:{},inverse:self.program(4, program4, data),fn:self.program(2, program2, data),contexts:[depth0],types:["ID"],hashContexts:hashContexts,hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n        </td>\n      </tr>\n      ");
  return buffer;
  }
function program2(depth0,data) {
  
  var buffer = '', hashTypes, hashContexts;
  data.buffer.push("\n          <a href=\"/settings/invoices/");
  hashTypes = {};
  hashContexts = {};
  data.buffer.push(escapeExpression(helpers.unbound.call(depth0, "invoice", {hash:{},contexts:[depth0],types:["ID"],hashContexts:hashContexts,hashTypes:hashTypes,data:data})));
  data.buffer.push("\">HTML</a> | <a href=\"/settings/invoices/");
  hashTypes = {};
  hashContexts = {};
  data.buffer.push(escapeExpression(helpers.unbound.call(depth0, "invoice", {hash:{},contexts:[depth0],types:["ID"],hashContexts:hashContexts,hashTypes:hashTypes,data:data})));
  data.buffer.push(".pdf\">PDF</a>\n         ");
  return buffer;
  }

function program4(depth0,data) {
  
  
  data.buffer.push("\n          UNPAID\n         ");
  }

function program6(depth0,data) {
  
  
  data.buffer.push("\n      <tr>\n        <td colspan='4' class=\"empty\">No charges yet</td>\n      </tr>\n      ");
  }

  data.buffer.push("<div class=\"receipt-information\">\n  <h3>Receipt info <small>(optional)</small></h3>\n  <p>\n  HuBoard does not provide invoices, but if you need additional contact or tax information added to your\n  receipts (business address, VAT number, etc.), enter it below and it will appear on all of your receipts.\n  </p>\n  <p>\n  ");
  hashContexts = {'value': depth0};
  hashTypes = {'value': "ID"};
  options = {hash:{
    'value': ("model.history.additional_info")
  },contexts:[],types:[],hashContexts:hashContexts,hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.textarea || depth0.textarea),stack1 ? stack1.call(depth0, options) : helperMissing.call(depth0, "textarea", options))));
  data.buffer.push("\n\n  <button class=\"hb-button small\"\n    ");
  hashTypes = {};
  hashContexts = {};
  data.buffer.push(escapeExpression(helpers.action.call(depth0, "saveAdditionalInfo", "", {hash:{},contexts:[depth0,depth0],types:["ID","ID"],hashContexts:hashContexts,hashTypes:hashTypes,data:data})));
  data.buffer.push(" ");
  hashContexts = {'disabled': depth0};
  hashTypes = {'disabled': "ID"};
  data.buffer.push(escapeExpression(helpers['bind-attr'].call(depth0, {hash:{
    'disabled': ("processing")
  },contexts:[],types:[],hashContexts:hashContexts,hashTypes:hashTypes,data:data})));
  data.buffer.push(" >Update</button>\n  </p>\n\n</div>\n\n <div class=\"table-wrapper\">\n  <table class=\"table\">\n    <thead>\n      <th>Date</th>\n      <th>Account</th>\n      <th>Amount</th>\n      <th></th>\n    </head>\n    <tbody>\n\n      ");
  hashTypes = {};
  hashContexts = {};
  stack2 = helpers.each.call(depth0, "model.history.charges", {hash:{},inverse:self.program(6, program6, data),fn:self.program(1, program1, data),contexts:[depth0],types:["ID"],hashContexts:hashContexts,hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n    </tbody>\n  </table>\n</div>\n");
  return buffer;
  
});

Ember.TEMPLATES['index'] = Ember.Handlebars.template(function anonymous(Handlebars,depth0,helpers,partials,data) {
this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Ember.Handlebars.helpers); data = data || {};
  var buffer = '', stack1, options, hashTypes, hashContexts, helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression, self=this, functionType="function", blockHelperMissing=helpers.blockHelperMissing;

function program1(depth0,data) {
  
  var buffer = '', stack1, stack2, hashContexts, hashTypes, options;
  data.buffer.push("\n    ");
  hashContexts = {'title': depth0};
  hashTypes = {'title': "STRING"};
  options = {hash:{
    'title': ("Plans")
  },inverse:self.noop,fn:self.program(2, program2, data),contexts:[],types:[],hashContexts:hashContexts,hashTypes:hashTypes,data:data};
  stack2 = ((stack1 = helpers['x-pane'] || depth0['x-pane']),stack1 ? stack1.call(depth0, options) : helperMissing.call(depth0, "x-pane", options));
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n    ");
  hashContexts = {'title': depth0};
  hashTypes = {'title': "STRING"};
  options = {hash:{
    'title': ("Billing")
  },inverse:self.noop,fn:self.program(4, program4, data),contexts:[],types:[],hashContexts:hashContexts,hashTypes:hashTypes,data:data};
  stack2 = ((stack1 = helpers['x-pane'] || depth0['x-pane']),stack1 ? stack1.call(depth0, options) : helperMissing.call(depth0, "x-pane", options));
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n");
  return buffer;
  }
function program2(depth0,data) {
  
  var buffer = '', stack1, hashTypes, hashContexts, options;
  data.buffer.push("\n    <div class=\"nav-section\">\n      <div class=\"widget-body\">\n          ");
  hashTypes = {};
  hashContexts = {};
  options = {hash:{},contexts:[depth0,depth0],types:["ID","ID"],hashContexts:hashContexts,hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.render || depth0.render),stack1 ? stack1.call(depth0, "account", "model", options) : helperMissing.call(depth0, "render", "account", "model", options))));
  data.buffer.push("\n      </div>\n    </div>\n    ");
  return buffer;
  }

function program4(depth0,data) {
  
  var buffer = '', stack1, hashTypes, hashContexts, options;
  data.buffer.push("\n        <div class=\"nav-section\">\n\n        <div class=\"widget-body\">\n          ");
  hashTypes = {};
  hashContexts = {};
  options = {hash:{},contexts:[depth0,depth0],types:["ID","ID"],hashContexts:hashContexts,hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.render || depth0.render),stack1 ? stack1.call(depth0, "history", "model", options) : helperMissing.call(depth0, "render", "history", "model", options))));
  data.buffer.push("\n        </div>\n      </div>\n    ");
  return buffer;
  }

  options = {hash:{},inverse:self.noop,fn:self.program(1, program1, data),contexts:[],types:[],hashContexts:hashContexts,hashTypes:hashTypes,data:data};
  if (stack1 = helpers['x-tabs']) { stack1 = stack1.call(depth0, options); }
  else { stack1 = depth0['x-tabs']; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  hashTypes = {};
  hashContexts = {};
  if (!helpers['x-tabs']) { stack1 = blockHelperMissing.call(depth0, 'x-tabs', options); }
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push("\n");
  return buffer;
  
});

Ember.TEMPLATES['loading'] = Ember.Handlebars.template(function anonymous(Handlebars,depth0,helpers,partials,data) {
this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Ember.Handlebars.helpers); data = data || {};
  


  data.buffer.push("<div class=\"fullscreen-overlay\"></div>\n");
  
});

Ember.TEMPLATES['profile'] = Ember.Handlebars.template(function anonymous(Handlebars,depth0,helpers,partials,data) {
this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Ember.Handlebars.helpers); data = data || {};
  var buffer = '', stack1, options, hashTypes, hashContexts, helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression, self=this, functionType="function", blockHelperMissing=helpers.blockHelperMissing;

function program1(depth0,data) {
  
  var buffer = '', stack1, stack2, hashContexts, hashTypes, options;
  data.buffer.push("\n  ");
  hashContexts = {'title': depth0};
  hashTypes = {'title': "STRING"};
  options = {hash:{
    'title': ("Plans")
  },inverse:self.noop,fn:self.program(2, program2, data),contexts:[],types:[],hashContexts:hashContexts,hashTypes:hashTypes,data:data};
  stack2 = ((stack1 = helpers['x-pane'] || depth0['x-pane']),stack1 ? stack1.call(depth0, options) : helperMissing.call(depth0, "x-pane", options));
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n  ");
  hashTypes = {};
  hashContexts = {};
  stack2 = helpers['if'].call(depth0, "model.details.org.is_owner", {hash:{},inverse:self.noop,fn:self.program(7, program7, data),contexts:[depth0],types:["ID"],hashContexts:hashContexts,hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n");
  return buffer;
  }
function program2(depth0,data) {
  
  var buffer = '', stack1, hashTypes, hashContexts;
  data.buffer.push("\n      <div class=\"nav-section\">\n\n      <div class=\"widget-body\">\n        ");
  hashTypes = {};
  hashContexts = {};
  stack1 = helpers['if'].call(depth0, "model.details.org.is_owner", {hash:{},inverse:self.program(5, program5, data),fn:self.program(3, program3, data),contexts:[depth0],types:["ID"],hashContexts:hashContexts,hashTypes:hashTypes,data:data});
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push("\n      </div>\n    </div>\n  ");
  return buffer;
  }
function program3(depth0,data) {
  
  var buffer = '', stack1, hashTypes, hashContexts, options;
  data.buffer.push("\n\n          ");
  hashTypes = {};
  hashContexts = {};
  options = {hash:{},contexts:[depth0,depth0],types:["ID","ID"],hashContexts:hashContexts,hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.render || depth0.render),stack1 ? stack1.call(depth0, "account", "model", options) : helperMissing.call(depth0, "render", "account", "model", options))));
  data.buffer.push("\n\n        ");
  return buffer;
  }

function program5(depth0,data) {
  
  var buffer = '', hashTypes, hashContexts;
  data.buffer.push("\n          <div class=\"alert\">\n            <h5>You must be an owner to purchase</h5>\n            It appears like you are not a member of the owners team for ");
  hashTypes = {};
  hashContexts = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "model.login", {hash:{},contexts:[depth0],types:["ID"],hashContexts:hashContexts,hashTypes:hashTypes,data:data})));
  data.buffer.push(". \n            We strongly encourage that only members of the &quot;Owners&quot; team have access to subscription\n            information. If you have any questions feel free to email customer support at\n            <a href=\"mailto:support@huboard.com\">support@huboard.com</a>. \n          </div>\n        ");
  return buffer;
  }

function program7(depth0,data) {
  
  var buffer = '', stack1, stack2, hashContexts, hashTypes, options;
  data.buffer.push("\n    ");
  hashContexts = {'title': depth0};
  hashTypes = {'title': "STRING"};
  options = {hash:{
    'title': ("Billing")
  },inverse:self.noop,fn:self.program(8, program8, data),contexts:[],types:[],hashContexts:hashContexts,hashTypes:hashTypes,data:data};
  stack2 = ((stack1 = helpers['x-pane'] || depth0['x-pane']),stack1 ? stack1.call(depth0, options) : helperMissing.call(depth0, "x-pane", options));
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n  ");
  return buffer;
  }
function program8(depth0,data) {
  
  var buffer = '', stack1, hashTypes, hashContexts, options;
  data.buffer.push("\n        <div class=\"nav-section\">\n\n        <div class=\"widget-body\">\n          ");
  hashTypes = {};
  hashContexts = {};
  options = {hash:{},contexts:[depth0,depth0],types:["ID","ID"],hashContexts:hashContexts,hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.render || depth0.render),stack1 ? stack1.call(depth0, "history", "model", options) : helperMissing.call(depth0, "render", "history", "model", options))));
  data.buffer.push("\n        </div>\n      </div>\n    ");
  return buffer;
  }

  options = {hash:{},inverse:self.noop,fn:self.program(1, program1, data),contexts:[],types:[],hashContexts:hashContexts,hashTypes:hashTypes,data:data};
  if (stack1 = helpers['x-tabs']) { stack1 = stack1.call(depth0, options); }
  else { stack1 = depth0['x-tabs']; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  hashTypes = {};
  hashContexts = {};
  if (!helpers['x-tabs']) { stack1 = blockHelperMissing.call(depth0, 'x-tabs', options); }
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push("\n");
  return buffer;
  
});

Ember.TEMPLATES['purchase_form'] = Ember.Handlebars.template(function anonymous(Handlebars,depth0,helpers,partials,data) {
this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Ember.Handlebars.helpers); data = data || {};
  var buffer = '', stack1, stack2, hashContexts, hashTypes, options, escapeExpression=this.escapeExpression, helperMissing=helpers.helperMissing, self=this;

function program1(depth0,data) {
  
  var buffer = '', hashContexts, hashTypes;
  data.buffer.push("\n            ");
  hashContexts = {'valueBinding': depth0};
  hashTypes = {'valueBinding': "STRING"};
  data.buffer.push(escapeExpression(helpers.view.call(depth0, "App.CouponCodeField", {hash:{
    'valueBinding': ("coupon")
  },contexts:[depth0],types:["ID"],hashContexts:hashContexts,hashTypes:hashTypes,data:data})));
  data.buffer.push("\n          ");
  return buffer;
  }

function program3(depth0,data) {
  
  var buffer = '', hashTypes, hashContexts;
  data.buffer.push("\n        <div class=\"alert alert-error\">");
  hashTypes = {};
  hashContexts = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "errors", {hash:{},contexts:[depth0],types:["ID"],hashContexts:hashContexts,hashTypes:hashTypes,data:data})));
  data.buffer.push("</div>\n      ");
  return buffer;
  }

function program5(depth0,data) {
  
  
  data.buffer.push("\n      <div class=\"fullscreen-overlay\">\n      </div>\n    ");
  }

  data.buffer.push("<div class=\"fullscreen-credit-card\">\n  <form ");
  hashContexts = {'on': depth0};
  hashTypes = {'on': "ID"};
  data.buffer.push(escapeExpression(helpers.action.call(depth0, "process", {hash:{
    'on': ("submit")
  },contexts:[depth0],types:["ID"],hashContexts:hashContexts,hashTypes:hashTypes,data:data})));
  data.buffer.push(">\n  <div class=\"modal-header\">\n    <button type=\"button\" class=\"close\" ");
  hashTypes = {};
  hashContexts = {};
  data.buffer.push(escapeExpression(helpers.action.call(depth0, "close", {hash:{},contexts:[depth0],types:["ID"],hashContexts:hashContexts,hashTypes:hashTypes,data:data})));
  data.buffer.push(" data-dismiss=\"modal\" aria-hidden=\"true\">×</button>\n    Credit card infomation \n  </div>\n  <div style=\"padding:20px;\">\n    <p>\n      Thanks for choosing to become a paying customer! Once we successfully charge your credit card, we'll immediately upgrade your account to the <strong>");
  hashTypes = {};
  hashContexts = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "model.plan.name", {hash:{},contexts:[depth0],types:["ID"],hashContexts:hashContexts,hashTypes:hashTypes,data:data})));
  data.buffer.push("</strong> plan.\n    </p>\n    <fieldset>\n\n      <div class=\"form-row full\">\n        <label>\n          <span>Card Number</span>\n        </label>\n        ");
  hashContexts = {'valueBinding': depth0,'size': depth0};
  hashTypes = {'valueBinding': "STRING",'size': "INTEGER"};
  data.buffer.push(escapeExpression(helpers.view.call(depth0, "App.CardNumberField", {hash:{
    'valueBinding': ("number"),
    'size': (20)
  },contexts:[depth0],types:["ID"],hashContexts:hashContexts,hashTypes:hashTypes,data:data})));
  data.buffer.push("\n      </div>\n\n      <ul class=\"credit-cards\">\n        <li ");
  hashContexts = {'class': depth0};
  hashTypes = {'class': "STRING"};
  data.buffer.push(escapeExpression(helpers['bind-attr'].call(depth0, {hash:{
    'class': (":card :card-visa cardType")
  },contexts:[],types:[],hashContexts:hashContexts,hashTypes:hashTypes,data:data})));
  data.buffer.push(" >\n        </li>\n        <li ");
  hashContexts = {'class': depth0};
  hashTypes = {'class': "STRING"};
  data.buffer.push(escapeExpression(helpers['bind-attr'].call(depth0, {hash:{
    'class': (":card :card-master cardType")
  },contexts:[],types:[],hashContexts:hashContexts,hashTypes:hashTypes,data:data})));
  data.buffer.push(" >\n        </li>\n        <li ");
  hashContexts = {'class': depth0};
  hashTypes = {'class': "STRING"};
  data.buffer.push(escapeExpression(helpers['bind-attr'].call(depth0, {hash:{
    'class': (":card :card-discover cardType")
  },contexts:[],types:[],hashContexts:hashContexts,hashTypes:hashTypes,data:data})));
  data.buffer.push(" >\n        </li>\n        <li ");
  hashContexts = {'class': depth0};
  hashTypes = {'class': "STRING"};
  data.buffer.push(escapeExpression(helpers['bind-attr'].call(depth0, {hash:{
    'class': (":card :card-express cardType")
  },contexts:[],types:[],hashContexts:hashContexts,hashTypes:hashTypes,data:data})));
  data.buffer.push(">\n        </li>\n      </ul>\n\n      <div class=\"form-row\">\n        <label>\n          <span>CVC</span>\n        </label>\n        ");
  hashContexts = {'valueBinding': depth0,'size': depth0,'data-stripe': depth0};
  hashTypes = {'valueBinding': "STRING",'size': "STRING",'data-stripe': "STRING"};
  data.buffer.push(escapeExpression(helpers.view.call(depth0, "App.CvcField", {hash:{
    'valueBinding': ("cvc"),
    'size': ("4"),
    'data-stripe': ("cvc")
  },contexts:[depth0],types:["ID"],hashContexts:hashContexts,hashTypes:hashTypes,data:data})));
  data.buffer.push("\n      </div>\n\n      <div class=\"form-row\">\n        <label>\n          <span>Expiration (");
  hashTypes = {};
  hashContexts = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "expMonth", {hash:{},contexts:[depth0],types:["ID"],hashContexts:hashContexts,hashTypes:hashTypes,data:data})));
  data.buffer.push(" / ");
  hashTypes = {};
  hashContexts = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "expYear", {hash:{},contexts:[depth0],types:["ID"],hashContexts:hashContexts,hashTypes:hashTypes,data:data})));
  data.buffer.push(")</span>\n        </label>\n        ");
  hashContexts = {'valueBinding': depth0};
  hashTypes = {'valueBinding': "STRING"};
  data.buffer.push(escapeExpression(helpers.view.call(depth0, "App.CardExpiryField", {hash:{
    'valueBinding': ("exp")
  },contexts:[depth0],types:["ID"],hashContexts:hashContexts,hashTypes:hashTypes,data:data})));
  data.buffer.push("\n      </div>\n\n      <div class=\"form-row\">\n        <label>\n          <span>Billing email</span>\n        </label>\n        ");
  hashTypes = {};
  hashContexts = {};
  data.buffer.push(escapeExpression(helpers.log.call(depth0, "model.org", {hash:{},contexts:[depth0],types:["ID"],hashContexts:hashContexts,hashTypes:hashTypes,data:data})));
  data.buffer.push("\n        ");
  hashContexts = {'valueBinding': depth0,'type': depth0,'required': depth0};
  hashTypes = {'valueBinding': "STRING",'type': "ID",'required': "BOOLEAN"};
  options = {hash:{
    'valueBinding': ("model.org.billing_email"),
    'type': ("text"),
    'required': (true)
  },contexts:[],types:[],hashContexts:hashContexts,hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.input || depth0.input),stack1 ? stack1.call(depth0, options) : helperMissing.call(depth0, "input", options))));
  data.buffer.push("\n      </div>\n\n      <div class=\"form-row full\">\n        <tr>\n          <td> Have Coupon? </td>\n          <td> ");
  hashContexts = {'checkedBinding': depth0};
  hashTypes = {'checkedBinding': "STRING"};
  data.buffer.push(escapeExpression(helpers.view.call(depth0, "App.CouponCheckbox", {hash:{
    'checkedBinding': ("couponChecked")
  },contexts:[depth0],types:["ID"],hashContexts:hashContexts,hashTypes:hashTypes,data:data})));
  data.buffer.push(" </td>\n        </tr>\n        <label>\n          ");
  hashTypes = {};
  hashContexts = {};
  stack2 = helpers['if'].call(depth0, "couponChecked", {hash:{},inverse:self.noop,fn:self.program(1, program1, data),contexts:[depth0],types:["ID"],hashContexts:hashContexts,hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n        </label>\n      </div>\n\n      ");
  hashTypes = {};
  hashContexts = {};
  stack2 = helpers['if'].call(depth0, "errors", {hash:{},inverse:self.noop,fn:self.program(3, program3, data),contexts:[depth0],types:["ID"],hashContexts:hashContexts,hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n\n    </fieldset>\n\n    <p>\n      Please review the <a href=\"/site/terms\" target=\"_blank\">terms of service</a>, and <a href=\"/site/privacy\" target=\"_blank\">privacy policy</a>.\n    </p>\n\n    ");
  hashTypes = {};
  hashContexts = {};
  stack2 = helpers['if'].call(depth0, "processingCard", {hash:{},inverse:self.noop,fn:self.program(5, program5, data),contexts:[depth0],types:["ID"],hashContexts:hashContexts,hashTypes:hashTypes,data:data});
  if(stack2 || stack2 === 0) { data.buffer.push(stack2); }
  data.buffer.push("\n  </div>\n  <div class=\"modal-footer\">\n      <button href=\"#\" class=\"stripe-connect light-blue\" type=\"submit\" ");
  hashContexts = {'disabled': depth0};
  hashTypes = {'disabled': "STRING"};
  options = {hash:{
    'disabled': ("isDisabled")
  },contexts:[],types:[],hashContexts:hashContexts,hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.bindAttr || depth0.bindAttr),stack1 ? stack1.call(depth0, options) : helperMissing.call(depth0, "bindAttr", options))));
  data.buffer.push("><span>Pay with stripe</span></button>\n  </div>\n  </form>\n</div>\n");
  return buffer;
  
});

Ember.TEMPLATES['update_card'] = Ember.Handlebars.template(function anonymous(Handlebars,depth0,helpers,partials,data) {
this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Ember.Handlebars.helpers); data = data || {};
  var buffer = '', stack1, hashContexts, hashTypes, options, escapeExpression=this.escapeExpression, self=this, helperMissing=helpers.helperMissing;

function program1(depth0,data) {
  
  var buffer = '', hashTypes, hashContexts;
  data.buffer.push("\n          <div class=\"alert alert-error\">");
  hashTypes = {};
  hashContexts = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "errors", {hash:{},contexts:[depth0],types:["ID"],hashContexts:hashContexts,hashTypes:hashTypes,data:data})));
  data.buffer.push("</div>\n        ");
  return buffer;
  }

function program3(depth0,data) {
  
  
  data.buffer.push("\n        <div class=\"fullscreen-overlay\">\n        </div>\n      ");
  }

  data.buffer.push("<div class=\"fullscreen-credit-card\">\n  <form ");
  hashContexts = {'on': depth0};
  hashTypes = {'on': "ID"};
  data.buffer.push(escapeExpression(helpers.action.call(depth0, "process", {hash:{
    'on': ("submit")
  },contexts:[depth0],types:["ID"],hashContexts:hashContexts,hashTypes:hashTypes,data:data})));
  data.buffer.push(">\n    <div class=\"modal-header\">\n      <button type=\"button\" class=\"close\" ");
  hashTypes = {};
  hashContexts = {};
  data.buffer.push(escapeExpression(helpers.action.call(depth0, "close", {hash:{},contexts:[depth0],types:["ID"],hashContexts:hashContexts,hashTypes:hashTypes,data:data})));
  data.buffer.push(" data-dismiss=\"modal\" aria-hidden=\"true\">×</button>\n      Update credit card infomation \n    </div>\n    <div class=\"modal-body\">\n      <fieldset>\n\n        ");
  hashTypes = {};
  hashContexts = {};
  stack1 = helpers['if'].call(depth0, "errors", {hash:{},inverse:self.noop,fn:self.program(1, program1, data),contexts:[depth0],types:["ID"],hashContexts:hashContexts,hashTypes:hashTypes,data:data});
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push("\n\n        <div class=\"form-row full\">\n          <label>\n            <span>Card Number</span>\n          </label>\n          ");
  hashContexts = {'valueBinding': depth0,'size': depth0};
  hashTypes = {'valueBinding': "STRING",'size': "INTEGER"};
  data.buffer.push(escapeExpression(helpers.view.call(depth0, "App.CardNumberField", {hash:{
    'valueBinding': ("number"),
    'size': (20)
  },contexts:[depth0],types:["ID"],hashContexts:hashContexts,hashTypes:hashTypes,data:data})));
  data.buffer.push("\n        </div>\n\n        <ul class=\"credit-cards\">\n          <li ");
  hashContexts = {'class': depth0};
  hashTypes = {'class': "STRING"};
  data.buffer.push(escapeExpression(helpers['bind-attr'].call(depth0, {hash:{
    'class': (":card :card-visa cardType")
  },contexts:[],types:[],hashContexts:hashContexts,hashTypes:hashTypes,data:data})));
  data.buffer.push(" >\n          </li>\n          <li ");
  hashContexts = {'class': depth0};
  hashTypes = {'class': "STRING"};
  data.buffer.push(escapeExpression(helpers['bind-attr'].call(depth0, {hash:{
    'class': (":card :card-master cardType")
  },contexts:[],types:[],hashContexts:hashContexts,hashTypes:hashTypes,data:data})));
  data.buffer.push(" >\n          </li>\n          <li ");
  hashContexts = {'class': depth0};
  hashTypes = {'class': "STRING"};
  data.buffer.push(escapeExpression(helpers['bind-attr'].call(depth0, {hash:{
    'class': (":card :card-discover cardType")
  },contexts:[],types:[],hashContexts:hashContexts,hashTypes:hashTypes,data:data})));
  data.buffer.push(" >\n          </li>\n          <li ");
  hashContexts = {'class': depth0};
  hashTypes = {'class': "STRING"};
  data.buffer.push(escapeExpression(helpers['bind-attr'].call(depth0, {hash:{
    'class': (":card :card-express cardType")
  },contexts:[],types:[],hashContexts:hashContexts,hashTypes:hashTypes,data:data})));
  data.buffer.push(">\n          </li>\n        </ul>\n\n        <div class=\"form-row\">\n          <label>\n            <span>CVC</span>\n          </label>\n          ");
  hashContexts = {'valueBinding': depth0,'size': depth0,'data-stripe': depth0};
  hashTypes = {'valueBinding': "STRING",'size': "STRING",'data-stripe': "STRING"};
  data.buffer.push(escapeExpression(helpers.view.call(depth0, "App.CvcField", {hash:{
    'valueBinding': ("cvc"),
    'size': ("4"),
    'data-stripe': ("cvc")
  },contexts:[depth0],types:["ID"],hashContexts:hashContexts,hashTypes:hashTypes,data:data})));
  data.buffer.push("\n        </div>\n\n        <div class=\"form-row\">\n          <label>\n            <span>Expiration (");
  hashTypes = {};
  hashContexts = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "expMonth", {hash:{},contexts:[depth0],types:["ID"],hashContexts:hashContexts,hashTypes:hashTypes,data:data})));
  data.buffer.push(" / ");
  hashTypes = {};
  hashContexts = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "expYear", {hash:{},contexts:[depth0],types:["ID"],hashContexts:hashContexts,hashTypes:hashTypes,data:data})));
  data.buffer.push(")</span>\n          </label>\n          ");
  hashContexts = {'valueBinding': depth0};
  hashTypes = {'valueBinding': "STRING"};
  data.buffer.push(escapeExpression(helpers.view.call(depth0, "App.CardExpiryField", {hash:{
    'valueBinding': ("exp")
  },contexts:[depth0],types:["ID"],hashContexts:hashContexts,hashTypes:hashTypes,data:data})));
  data.buffer.push("\n        </div>\n\n\n      </fieldset>\n\n      <p>\n        Please review the <a href=\"/site/terms\" target=\"_blank\">terms of service</a>, and <a href=\"/site/privacy\" target=\"_blank\">privacy policy</a>.\n      </p>\n\n      ");
  hashTypes = {};
  hashContexts = {};
  stack1 = helpers['if'].call(depth0, "processingCard", {hash:{},inverse:self.noop,fn:self.program(3, program3, data),contexts:[depth0],types:["ID"],hashContexts:hashContexts,hashTypes:hashTypes,data:data});
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push("\n    </div>\n    <div class=\"modal-footer\">\n        <button href=\"#\" class=\"stripe-connect light-blue\" type=\"submit\" ");
  hashContexts = {'disabled': depth0};
  hashTypes = {'disabled': "STRING"};
  options = {hash:{
    'disabled': ("processingCard")
  },contexts:[],types:[],hashContexts:hashContexts,hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.bindAttr || depth0.bindAttr),stack1 ? stack1.call(depth0, options) : helperMissing.call(depth0, "bindAttr", options))));
  data.buffer.push("><span>Update card</span></button>\n    </div>\n  </form>\n</div>\n");
  return buffer;
  
});

Ember.TEMPLATES['components/x-pane'] = Ember.Handlebars.template(function anonymous(Handlebars,depth0,helpers,partials,data) {
this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Ember.Handlebars.helpers); data = data || {};
  var buffer = '', stack1, hashContexts, hashTypes, options, helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression;


  data.buffer.push("<div class=\"tab-pane\" ");
  hashContexts = {'class': depth0};
  hashTypes = {'class': "STRING"};
  options = {hash:{
    'class': ("selected:active")
  },contexts:[],types:[],hashContexts:hashContexts,hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.bindAttr || depth0.bindAttr),stack1 ? stack1.call(depth0, options) : helperMissing.call(depth0, "bindAttr", options))));
  data.buffer.push(">\n  ");
  hashTypes = {};
  hashContexts = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "yield", {hash:{},contexts:[depth0],types:["ID"],hashContexts:hashContexts,hashTypes:hashTypes,data:data})));
  data.buffer.push("\n</div>\n");
  return buffer;
  
});

Ember.TEMPLATES['components/x-tabs'] = Ember.Handlebars.template(function anonymous(Handlebars,depth0,helpers,partials,data) {
this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Ember.Handlebars.helpers); data = data || {};
  var buffer = '', stack1, hashTypes, hashContexts, helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data) {
  
  var buffer = '', stack1, hashContexts, hashTypes, options;
  data.buffer.push("\n    <li ");
  hashContexts = {'class': depth0};
  hashTypes = {'class': "STRING"};
  options = {hash:{
    'class': ("pane.selected:active")
  },contexts:[],types:[],hashContexts:hashContexts,hashTypes:hashTypes,data:data};
  data.buffer.push(escapeExpression(((stack1 = helpers.bindAttr || depth0.bindAttr),stack1 ? stack1.call(depth0, options) : helperMissing.call(depth0, "bindAttr", options))));
  data.buffer.push(">\n      <a href=\"#\" ");
  hashTypes = {};
  hashContexts = {};
  data.buffer.push(escapeExpression(helpers.action.call(depth0, "select", "pane", {hash:{},contexts:[depth0,depth0],types:["ID","ID"],hashContexts:hashContexts,hashTypes:hashTypes,data:data})));
  data.buffer.push(">");
  hashTypes = {};
  hashContexts = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "pane.title", {hash:{},contexts:[depth0],types:["ID"],hashContexts:hashContexts,hashTypes:hashTypes,data:data})));
  data.buffer.push("</a>\n    </li>\n    ");
  return buffer;
  }

  data.buffer.push("<div class=\"tabbable\">\n  <ul class=\"nav nav-tabs\">\n    ");
  hashTypes = {};
  hashContexts = {};
  stack1 = helpers.each.call(depth0, "pane", "in", "panes", {hash:{},inverse:self.noop,fn:self.program(1, program1, data),contexts:[depth0,depth0,depth0],types:["ID","ID","ID"],hashContexts:hashContexts,hashTypes:hashTypes,data:data});
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push("\n  </ul>\n  <div class=\"tab-content\">\n    ");
  hashTypes = {};
  hashContexts = {};
  data.buffer.push(escapeExpression(helpers._triageMustache.call(depth0, "yield", {hash:{},contexts:[depth0],types:["ID"],hashContexts:hashContexts,hashTypes:hashTypes,data:data})));
  data.buffer.push("\n  </div>\n</div>\n");
  return buffer;
  
});



},{}],23:[function(require,module,exports){
require("./modal_view")

ApplyCouponView = ModalView.extend({
  processingAction: Ember.computed.alias('controller.processingAction')
});

module.exports = ApplyCouponView;

},{"./modal_view":26}],24:[function(require,module,exports){
require("./modal_view")

CancelFormView = ModalView.extend({
  processingAction: Ember.computed.alias('controller.processingAction')
});

module.exports = CancelFormView;

},{"./modal_view":26}],25:[function(require,module,exports){
require("../../spin.js");

var LoadingView = Ember.View.extend({
  didInsertElement: function(){
     $("body").addClass("fullscreen-open")
     var opts = {
       lines: 13, // The number of lines to draw
       length: 0, // The length of each line
       width: 6, // The line thickness
       radius: 14, // The radius of the inner circle
       corners: 1, // Corner roundness (0..1)
       rotate: 19, // The rotation offset
       direction: 1, // 1: clockwise, -1: counterclockwise
       color: '#4a3e93', // #rgb or #rrggbb or array of colors
       speed: 0.3, // Rounds per second
       trail: 42, // Afterglow percentage
       shadow: false, // Whether to render a shadow
       hwaccel: true, // Whether to use hardware acceleration
       className: 'spinner', // The CSS class to assign to the spinner
       zIndex: 2e9, // The z-index (defaults to 2000000000)
       top: 'auto', // Top position relative to parent in px
       left: 'auto' // Left position relative to parent in px
     };
     new Spinner(opts).spin(this.$().get(0))
     return this._super();
  },
  willDestroyElement: function(){
    $("body").removeClass("fullscreen-open")
    return this._super();
  }
});

module.exports = LoadingView;

},{"../../spin.js":29}],26:[function(require,module,exports){
ModalView = Em.View.extend({
  layout: Em.Handlebars.compile("<div class='fullscreen-overlay fixed'><div class='fullscreen-wrapper'><div class='fullscreen-body credit-card'>{{yield}}</div></div></div>"),

  didInsertElement: function() {
    App.animateModalOpen();

    $('body').on('keyup.modal', function(event) {
      if (event.keyCode === 27) this.get('controller').send('close');
    }.bind(this));
    
    this.$(".fullscreen-body").on('click.modal', function(event){
       event.stopPropagation();    
    }.bind(this))
     
    this.$(".fullscreen-overlay, .close").on('click.modal', function(event){
     this.get('controller').send('close');        
    }.bind(this))
    
   


    this.$(':input:not(.close)').first().focus();
  },

  willDestroyElement: function() {
    $('body').off('keyup.modal');
    this.$(".fullscreen-overlay,.fullscreen-body").off("click.modal");
  }
});

module.exports = ModalView;

},{}],27:[function(require,module,exports){
require("./modal_view")

PurchaseFormView = ModalView.extend({
  processingPurchase: Ember.computed.alias('controller.processingCard')
});

module.exports = PurchaseFormView;

},{"./modal_view":26}],28:[function(require,module,exports){
require("./modal_view")

UpdateCardView = ModalView.extend({
 processingCard: Ember.computed.alias('controller.processingCard')
});

module.exports = UpdateCardView;

},{"./modal_view":26}],29:[function(require,module,exports){
//fgnass.github.com/spin.js#v1.3

/**
 * Copyright (c) 2011-2013 Felix Gnass
 * Licensed under the MIT license
 */
(function(root, factory) {

  /* CommonJS */
  if (typeof exports == 'object')  module.exports = factory()

  /* AMD module */
  else if (typeof define == 'function' && define.amd) define(factory)

  /* Browser global */
  else root.Spinner = factory()
}
(this, function() {
  "use strict";

  var prefixes = ['webkit', 'Moz', 'ms', 'O'] /* Vendor prefixes */
    , animations = {} /* Animation rules keyed by their name */
    , useCssAnimations /* Whether to use CSS animations or setTimeout */

  /**
   * Utility function to create elements. If no tag name is given,
   * a DIV is created. Optionally properties can be passed.
   */
  function createEl(tag, prop) {
    var el = document.createElement(tag || 'div')
      , n

    for(n in prop) el[n] = prop[n]
    return el
  }

  /**
   * Appends children and returns the parent.
   */
  function ins(parent /* child1, child2, ...*/) {
    for (var i=1, n=arguments.length; i<n; i++)
      parent.appendChild(arguments[i])

    return parent
  }

  /**
   * Insert a new stylesheet to hold the @keyframe or VML rules.
   */
  var sheet = (function() {
    var el = createEl('style', {type : 'text/css'})
    ins(document.getElementsByTagName('head')[0], el)
    return el.sheet || el.styleSheet
  }())

  /**
   * Creates an opacity keyframe animation rule and returns its name.
   * Since most mobile Webkits have timing issues with animation-delay,
   * we create separate rules for each line/segment.
   */
  function addAnimation(alpha, trail, i, lines) {
    var name = ['opacity', trail, ~~(alpha*100), i, lines].join('-')
      , start = 0.01 + i/lines * 100
      , z = Math.max(1 - (1-alpha) / trail * (100-start), alpha)
      , prefix = useCssAnimations.substring(0, useCssAnimations.indexOf('Animation')).toLowerCase()
      , pre = prefix && '-' + prefix + '-' || ''

    if (!animations[name]) {
      sheet.insertRule(
        '@' + pre + 'keyframes ' + name + '{' +
        '0%{opacity:' + z + '}' +
        start + '%{opacity:' + alpha + '}' +
        (start+0.01) + '%{opacity:1}' +
        (start+trail) % 100 + '%{opacity:' + alpha + '}' +
        '100%{opacity:' + z + '}' +
        '}', sheet.cssRules.length)

      animations[name] = 1
    }

    return name
  }

  /**
   * Tries various vendor prefixes and returns the first supported property.
   */
  function vendor(el, prop) {
    var s = el.style
      , pp
      , i

    if(s[prop] !== undefined) return prop
    prop = prop.charAt(0).toUpperCase() + prop.slice(1)
    for(i=0; i<prefixes.length; i++) {
      pp = prefixes[i]+prop
      if(s[pp] !== undefined) return pp
    }
  }

  /**
   * Sets multiple style properties at once.
   */
  function css(el, prop) {
    for (var n in prop)
      el.style[vendor(el, n)||n] = prop[n]

    return el
  }

  /**
   * Fills in default values.
   */
  function merge(obj) {
    for (var i=1; i < arguments.length; i++) {
      var def = arguments[i]
      for (var n in def)
        if (obj[n] === undefined) obj[n] = def[n]
    }
    return obj
  }

  /**
   * Returns the absolute page-offset of the given element.
   */
  function pos(el) {
    var o = { x:el.offsetLeft, y:el.offsetTop }
    while((el = el.offsetParent))
      o.x+=el.offsetLeft, o.y+=el.offsetTop

    return o
  }

  // Built-in defaults

  var defaults = {
    lines: 12,            // The number of lines to draw
    length: 7,            // The length of each line
    width: 5,             // The line thickness
    radius: 10,           // The radius of the inner circle
    rotate: 0,            // Rotation offset
    corners: 1,           // Roundness (0..1)
    color: '#000',        // #rgb or #rrggbb
    direction: 1,         // 1: clockwise, -1: counterclockwise
    speed: 1,             // Rounds per second
    trail: 100,           // Afterglow percentage
    opacity: 1/4,         // Opacity of the lines
    fps: 20,              // Frames per second when using setTimeout()
    zIndex: 2e9,          // Use a high z-index by default
    className: 'spinner', // CSS class to assign to the element
    top: 'auto',          // center vertically
    left: 'auto',         // center horizontally
    position: 'relative'  // element position
  }

  /** The constructor */
  function Spinner(o) {
    if (typeof this == 'undefined') return new Spinner(o)
    this.opts = merge(o || {}, Spinner.defaults, defaults)
  }

  // Global defaults that override the built-ins:
  Spinner.defaults = {}

  merge(Spinner.prototype, {

    /**
     * Adds the spinner to the given target element. If this instance is already
     * spinning, it is automatically removed from its previous target b calling
     * stop() internally.
     */
    spin: function(target) {
      this.stop()

      var self = this
        , o = self.opts
        , el = self.el = css(createEl(0, {className: o.className}), {position: o.position, width: 0, zIndex: o.zIndex})
        , mid = o.radius+o.length+o.width
        , ep // element position
        , tp // target position

      if (target) {
        target.insertBefore(el, target.firstChild||null)
        tp = pos(target)
        ep = pos(el)
        css(el, {
          left: (o.left == 'auto' ? tp.x-ep.x + (target.offsetWidth >> 1) : parseInt(o.left, 10) + mid) + 'px',
          top: (o.top == 'auto' ? tp.y-ep.y + (target.offsetHeight >> 1) : parseInt(o.top, 10) + mid)  + 'px'
        })
      }

      el.setAttribute('role', 'progressbar')
      self.lines(el, self.opts)

      if (!useCssAnimations) {
        // No CSS animation support, use setTimeout() instead
        var i = 0
          , start = (o.lines - 1) * (1 - o.direction) / 2
          , alpha
          , fps = o.fps
          , f = fps/o.speed
          , ostep = (1-o.opacity) / (f*o.trail / 100)
          , astep = f/o.lines

        ;(function anim() {
          i++;
          for (var j = 0; j < o.lines; j++) {
            alpha = Math.max(1 - (i + (o.lines - j) * astep) % f * ostep, o.opacity)

            self.opacity(el, j * o.direction + start, alpha, o)
          }
          self.timeout = self.el && setTimeout(anim, ~~(1000/fps))
        })()
      }
      return self
    },

    /**
     * Stops and removes the Spinner.
     */
    stop: function() {
      var el = this.el
      if (el) {
        clearTimeout(this.timeout)
        if (el.parentNode) el.parentNode.removeChild(el)
        this.el = undefined
      }
      return this
    },

    /**
     * Internal method that draws the individual lines. Will be overwritten
     * in VML fallback mode below.
     */
    lines: function(el, o) {
      var i = 0
        , start = (o.lines - 1) * (1 - o.direction) / 2
        , seg

      function fill(color, shadow) {
        return css(createEl(), {
          position: 'absolute',
          width: (o.length+o.width) + 'px',
          height: o.width + 'px',
          background: color,
          boxShadow: shadow,
          transformOrigin: 'left',
          transform: 'rotate(' + ~~(360/o.lines*i+o.rotate) + 'deg) translate(' + o.radius+'px' +',0)',
          borderRadius: (o.corners * o.width>>1) + 'px'
        })
      }

      for (; i < o.lines; i++) {
        seg = css(createEl(), {
          position: 'absolute',
          top: 1+~(o.width/2) + 'px',
          transform: o.hwaccel ? 'translate3d(0,0,0)' : '',
          opacity: o.opacity,
          animation: useCssAnimations && addAnimation(o.opacity, o.trail, start + i * o.direction, o.lines) + ' ' + 1/o.speed + 's linear infinite'
        })

        if (o.shadow) ins(seg, css(fill('#000', '0 0 4px ' + '#000'), {top: 2+'px'}))

        ins(el, ins(seg, fill(o.color, '0 0 1px rgba(0,0,0,.1)')))
      }
      return el
    },

    /**
     * Internal method that adjusts the opacity of a single line.
     * Will be overwritten in VML fallback mode below.
     */
    opacity: function(el, i, val) {
      if (i < el.childNodes.length) el.childNodes[i].style.opacity = val
    }

  })


  function initVML() {

    /* Utility function to create a VML tag */
    function vml(tag, attr) {
      return createEl('<' + tag + ' xmlns="urn:schemas-microsoft.com:vml" class="spin-vml">', attr)
    }

    // No CSS transforms but VML support, add a CSS rule for VML elements:
    sheet.addRule('.spin-vml', 'behavior:url(#default#VML)')

    Spinner.prototype.lines = function(el, o) {
      var r = o.length+o.width
        , s = 2*r

      function grp() {
        return css(
          vml('group', {
            coordsize: s + ' ' + s,
            coordorigin: -r + ' ' + -r
          }),
          { width: s, height: s }
        )
      }

      var margin = -(o.width+o.length)*2 + 'px'
        , g = css(grp(), {position: 'absolute', top: margin, left: margin})
        , i

      function seg(i, dx, filter) {
        ins(g,
          ins(css(grp(), {rotation: 360 / o.lines * i + 'deg', left: ~~dx}),
            ins(css(vml('roundrect', {arcsize: o.corners}), {
                width: r,
                height: o.width,
                left: o.radius,
                top: -o.width>>1,
                filter: filter
              }),
              vml('fill', {color: o.color, opacity: o.opacity}),
              vml('stroke', {opacity: 0}) // transparent stroke to fix color bleeding upon opacity change
            )
          )
        )
      }

      if (o.shadow)
        for (i = 1; i <= o.lines; i++)
          seg(i, -2, 'progid:DXImageTransform.Microsoft.Blur(pixelradius=2,makeshadow=1,shadowopacity=.3)')

      for (i = 1; i <= o.lines; i++) seg(i)
      return ins(el, g)
    }

    Spinner.prototype.opacity = function(el, i, val, o) {
      var c = el.firstChild
      o = o.shadow && o.lines || 0
      if (c && i+o < c.childNodes.length) {
        c = c.childNodes[i+o]; c = c && c.firstChild; c = c && c.firstChild
        if (c) c.opacity = val
      }
    }
  }

  var probe = css(createEl('group'), {behavior: 'url(#default#VML)'})

  if (!vendor(probe, 'transform') && probe.adj) initVML()
  else useCssAnimations = vendor(probe, 'animation')

  return Spinner

}));

},{}]},{},[15])
;