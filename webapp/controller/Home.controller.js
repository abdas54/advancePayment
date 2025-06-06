sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment",
    "sap/m/MessageBox"

],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, JSONModel, MessageToast, Fragment, MessageBox) {
        "use strict";
        var that;
        return Controller.extend("com.eros.advancepayment.controller.Home", {
            onInit: function () {
                that = this;
                $("body").css("zoom", "90%");
                this.oModel = this.getOwnerComponent().getModel();
                this.oModel.setSizeLimit(1000);
              
            },
            fnPressAdvancePayment: function(){
                this.getOwnerComponent().getRouter().navTo("RouteMain");
            },
            fnPressCancelAdvancePayment: function(){
this.getOwnerComponent().getRouter().navTo("AdvPaymentCancel");
            }
           
        });
    });
