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
    function (Controller,JSONModel,MessageToast,Fragment,MessageBox) {
        "use strict";
        var that;
        return Controller.extend("com.eros.advancepayment.controller.Main", {
            onInit: function () {
                that = this;
                $("body").css("zoom", "90%");
                this.getView().byId("page").setVisible(false);
                this.oModel = this.getOwnerComponent().getModel();

                this.customerAddressModel = new JSONModel();
                this.getView().setModel(this.customerAddressModel,"custAddModel");

                this.customerModel = this.getOwnerComponent().getModel("customerService");
                this.getView().setModel(this.customerModel,"CustomerModel");

                var showSection = new JSONModel();
                showSection.setData({
                    "selectedMode": ""
                });
                this.getView().setModel(showSection, "ShowSection");

                var model3 = new JSONModel();
                model3.setData({
                    "selectedMode": "Cash",
                    "cardPaymentMode" : 0
                });
                this.getView().setModel(model3, "ShowPaymentSection");
                this.validateLoggedInUser();
                this.shippingMethod = "";
                this.paymentEntSourceCounter = 0;
                this.paymentId = 0;
                this.sourceIdCounter = 0;
                this.aPaymentEntries = [];
            },
            validateLoggedInUser: function(){
                var that = this;
                this.oModel.read("/StoreIDSet", {
                    success: function(oData) {
                        that.storeID = oData.results[0] ? oData.results[0].Store : "";
                        that.plantID = oData.results[0] ? oData.results[0].Plant : "";
                        that.onPressPayments();
                    },
                    error: function(oError) {
                        sap.m.MessageBox.show(JSON.parse(oError.responseText).error.message.value,{
                            icon: sap.m.MessageBox.Icon.Error,
                            title: "Error",
                            actions: [MessageBox.Action.OK],
                            onClose: function (oAction) {
                                if (oAction === MessageBox.Action.OK) {
                                    window.history.go(-1);
                                }
                            }
                        });
                    }
                });
            },
            onPressPayments: function() {
                if (!this._oDialogCashier) {
                    Fragment.load({
                        name: "com.eros.advancepayment.fragment.cashier",
                        controller: this
                    }).then(function(oFragment) {
                        this._oDialogCashier = oFragment;
                        this.getView().addDependent(this._oDialogCashier);
                        this._oDialogCashier.open();
                    }.bind(this));
                } else {
                    this._oDialogCashier.open();
                }
            },
            fnCloseCashier: function() {
                this._oDialogCashier.close();
            },
            fnValidateCashier: function(oEvent) {
                var that = this;
                that.getView().byId("page").setVisible(false);
                var empId = oEvent.getSource().getParent().getContent()[0].getItems()[0].getContent()[1].getValue();
                var pwd = oEvent.getSource().getParent().getContent()[0].getItems()[0].getContent()[3].getValue();
                var aFilters=[];
                
                aFilters.push(new sap.ui.model.Filter("Etype", sap.ui.model.FilterOperator.EQ, "C"));
                aFilters.push(new sap.ui.model.Filter("EmployeeId", sap.ui.model.FilterOperator.EQ, empId));
                aFilters.push(new sap.ui.model.Filter("SecretCode", sap.ui.model.FilterOperator.EQ, pwd));
               //EmployeeSet?$filter=Etype eq 'C' and EmployeeId eq '112' and SecretCode eq 'Abc#91234'
                
                this.oModel.read("/EmployeeSet", {
                    filters: aFilters,
                    success: function(oData) {
                        that.cashierID = oData.results[0] ? oData.results[0].EmployeeId : "";
                        that.cashierName = oData.results[0] ? oData.results[0].EmployeeName : "";
                        that._oDialogCashier.close();
                        that.getView().byId("cashier").setCount(oData.results[0].EmployeeName);
                        that.getView().byId("tranNumber").setCount(oData.results[0].TransactionId);
                        that.getView().byId("page").setVisible(true);
                        
                    },
                    error: function(oError) {
                        that.getView().byId("page").setVisible(false);
                        if(JSON.parse(oError.responseText).error.code === "CASHIER_CHECK"){
                            sap.m.MessageBox.show(
                                JSON.parse(oError.responseText).error.message.value, {
                                    icon: sap.m.MessageBox.Icon.Error,
                                    title: "Cashier Validation",
                                    actions: ["OK", "CANCEL"],
                                    onClose: function(oAction) {
                                        
                                    }
                                }
                            );
                        }
                        else{
                            sap.m.MessageBox.show(
                                JSON.parse(oError.responseText).error.message.value, {
                                    icon: sap.m.MessageBox.Icon.Error,
                                    title: "Error",
                                    actions: ["OK", "CANCEL"],
                                    onClose: function(oAction) {
                                        
                                    }
                                }
                            );
                        }
                        console.error("Error", oError);
                    }
                });
               
            },
            onPressCustData: function() {
                var oModel = new sap.ui.model.json.JSONModel({
                    customerData: [{
                        option: "Basic Information"
                    },  {
                        option: "Customer Address"
                    }]
                });
                this.getView().setModel(oModel, "CustModel");
                if (!this._oDialogCust) {
                    Fragment.load({
                        name: "com.eros.advancepayment.fragment.customer",
                        controller: this
                    }).then(function(oFragment) {
                        this._oDialogCust = oFragment;
                        this.getView().addDependent(this._oDialogCust);
                        this._oDialogCust.open();
                    }.bind(this));
                } else {
                    this._oDialogCust.open();
                }
    
            },
            onPressCustClose: function() {
                this._oDialogCust.close();
            },
            onPressCustSaveClose: function () {
                this.shippingAddress = "";
                this.shippingDate = "";
                this.shippingInst = "";

                var custData = this.getView().getModel("custAddModel").getData();
                var bFlag = this.validateCustomer();
                var addressParts = [];
                var customerName = [];

             

                if (custData.Name1) {
                    customerName.push(custData.Name1);
                }
                if (custData.Name2) {
                    customerName.push(custData.Name2);
                }
                var custName = customerName.join(" ");
                this.getView().byId("customer").setCount(custName);
                var selAddIndex = sap.ui.getCore().byId("addressRbGrp").getSelectedIndex();
                if (selAddIndex === 0) {

                    if (custData.home_add1) {
                        addressParts.push(custData.home_add1);
                    }
                    if (custData.home_add2) {
                        addressParts.push(custData.home_add2);
                    }
                    if (custData.home_po) {
                        addressParts.push(custData.home_po);
                    }
                    if (custData.home_City) {
                        addressParts.push(custData.home_City);
                    }
                    if (custData.home_Country) {
                        addressParts.push(custData.home_Country);
                    }

                }
                else if (selAddIndex === 1) {

                    if (custData.off_add1) {
                        addressParts.push(custData.home_add1);
                    }
                    if (custData.off_add2) {
                        addressParts.push(custData.home_add2);
                    }
                    if (custData.off_po) {
                        addressParts.push(custData.home_po);
                    }
                    if (custData.off_City) {
                        addressParts.push(custData.home_City);
                    }
                    if (custData.off_Country) {
                        addressParts.push(custData.home_Country);
                    }



                } else {

                    if (custData.oth_add1) {
                        addressParts.push(custData.home_add1);
                    }
                    if (custData.oth_add2) {
                        addressParts.push(custData.home_add2);
                    }
                    if (custData.oth_po) {
                        addressParts.push(custData.home_po);
                    }
                    if (custData.oth_City) {
                        addressParts.push(custData.home_City);
                    }
                    if (custData.oth_Country) {
                        addressParts.push(custData.home_Country);
                    }



                }
                this.shippingAddress = addressParts.join(" ");



                if (custData.shippingDate) {
                    var date = new Date(custData.shippingDate);
                    var pad = (n) => String(n).padStart(2, '0');
                    // this.shippingDate = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
                    this.shippingDate = custData.shippingDate;
                }

                if (custData.ShippingInst) {
                    this.shippingInst = custData.ShippingInst;
                }



                if (bFlag) {
                    this.updateCustomer();
                }

                // this._oDialogCust.close();

            },
            validateCustomer: function () {
                var bFlag;
               
                var custData = this.getView().getModel("custAddModel").getData();
                var errorMessage = "";

                // Basic Required Fields
                if (!custData.Name1 || custData.Name1.trim() === "") {
                    errorMessage += "First Name is required.\n";
                }
                if (!custData.country_code || custData.country_code.trim() === "") {
                    errorMessage += "Country Code is required.\n";
                }
                if (!custData.MobNo || custData.MobNo.trim() === "") {
                    errorMessage += "Mobile Number is required.\n";
                }
                if (!custData.CustType || custData.CustType.trim() === "") {
                    errorMessage += "Customer Type is required.\n";
                }

                // Additional fields for Tourist (CustType === "2")
                if (custData.CustType === "2") {
                    if (!custData.CardType || custData.CardType.trim() === "") {
                        errorMessage += "Card Type is required for Tourists.\n";
                    }
                    if (!custData.IssueBy || custData.IssueBy.trim() === "") {
                        errorMessage += "Issued By is required for Tourists.\n";
                    }
                    if (!custData.IdenCardNum || custData.IdenCardNum.trim() === "") {
                        errorMessage += "Card Number is required for Tourists.\n";
                    }
                }


                // Show message if there are errors
                if (errorMessage.length > 0) {
                    sap.m.MessageBox.error(errorMessage);
                    bFlag = false;
                }
                else {
                    bFlag = true;
                }

                return bFlag;


            },
            updateCustomer: function () {
                var that = this;
                var data = this.getView().getModel("custAddModel").getData();
                data.add_type = "";
                delete (data.shippingDate);
                delete (data.ShippingInst);
                delete (data.ShippingMethod);
                this.customerModel.create("/ZER_CUST_MASTERSet", data, {
                    success: function (oData) {
                        that._oDialogCust.close();
                        sap.m.MessageToast.show("Customer Update Successfully");
                    },
                    error: function (oError) {
                        sap.m.MessageToast.show("Error while Updating Customer");

                    }
                });

            },
            onOptionSelect: function(oEvent) {
                var sSelectedOption = oEvent.getSource().getTitle();
                var showSection = new JSONModel();
                showSection.setData({
                    "selectedMode": sSelectedOption
                });
                this.getView().setModel(showSection, "ShowSection");
                //	sap.m.MessageToast.show("Selected: " + sSelectedOption);
            },
            onSearchNumber: function(oEvent){
                var that=this;
                var searchNumber = oEvent.getParameter("query");
                this.customerModel.read("/ZER_CUST_MASTERSet(Kunnr='',MobNo='" + searchNumber + "')", {
                    success: function(oData) {
                        if(oData){
                             // this.getView().setModel(oModel1, "AddressModel");
                            that.getView().getModel("custAddModel").setData({});
                            that.getView().getModel("custAddModel").setData(oData);
                            that.getView().getModel("custAddModel").refresh();
                            that.getView().getModel("ShowSection").setProperty("/selectedMode","Basic Information");
    
                            if((oData.home_add1 !== "") || (oData.home_add2 !== "")){
                                that.getView().byId("addressRbGrp").selectedIndex("1");
                            }
                            else if((oData.off_add1 !== "") || (oData.off_add2 !== "")){
                                that.getView().byId("addressRbGrp").selectedIndex("2");
                               
                            }
                            else if((oData.oth_Add1 !== "") || (oData.oth_Add2 !== "")){
                                that.getView().byId("addressRbGrp").selectedIndex("3");
                                
                            }
                            else{
                                that.getView().byId("addressRbGrp").selectedIndex("1");
                            }
                            
                            
                        }
                        
                    },
                    error: function(oError) {
                        sap.m.MessageBox.show("Customer does not exist. Kindly add it",{
                            icon: sap.m.MessageBox.Icon.Error,
                            title: "Error",
                            actions: [MessageBox.Action.OK],
                            onClose: function (oAction) {
                                if (oAction === MessageBox.Action.OK) {
                                    that.getView().getModel("custAddModel").setData({});
                                    that.getView().getModel("ShowSection").setProperty("/selectedMode","Basic Information");
                                }
                            }
                        });
                    }
                });
            },
            onSelectAddressType: function(oEvent){
                if(oEvent.getParameter("selectedIndex") === 0){
                    sap.ui.getCore().byId("homeSection").setVisible(true);
                    sap.ui.getCore().byId("workSection").setVisible(false);
                    sap.ui.getCore().byId("otherSection").setVisible(false);
                }
                if(oEvent.getParameter("selectedIndex") === 1){
                    sap.ui.getCore().byId("homeSection").setVisible(false);
                    sap.ui.getCore().byId("workSection").setVisible(true);
                    sap.ui.getCore().byId("otherSection").setVisible(false);
                }
                if(oEvent.getParameter("selectedIndex") === 2){
                    sap.ui.getCore().byId("homeSection").setVisible(false);
                    sap.ui.getCore().byId("workSection").setVisible(false);
                    sap.ui.getCore().byId("otherSection").setVisible(true);
                }
            },
            onCustomerTypeChange: function(oEvent){
    
                if(oEvent.getParameter("selectedItem").getProperty("key") === "2"){
                    sap.ui.getCore().byId("cardTypelbl").setRequired(true);
                    sap.ui.getCore().byId("issuedBylbl").setRequired(true);
                    sap.ui.getCore().byId("cardNumberlbl").setRequired(true);
                }
                else{
                    sap.ui.getCore().byId("cardTypelbl").setRequired(false);
                    sap.ui.getCore().byId("issuedBylbl").setRequired(false);
                    sap.ui.getCore().byId("cardNumberlbl").setRequired(false);
                }
    
            },
            validCustomer: function(){
                var entered = this.getView().byId("customer").getCount();
                if(entered){
                    return true;
                }
                else {
                    return false
                }

            },
            onPressPayments1: function() {
                var checkCustomer = this.validCustomer();
                if(checkCustomer){

                var oModel = new sap.ui.model.json.JSONModel({
                    totalAmount: "0.00",
                    paymentOptions: [{
                        option: "Cash"
                    }, {
                        option: "Card"
                    },  {
                        option: "Non-GV"
                    }, 
                    {
                        option: "EGV"
                    }, ]
                });
                this.getView().setModel(oModel, "PaymentModel");
    
                var cashData = [{
                    denomination: "",
                    qty: 0,
                    total: 0
                }];
    
                var oModel1 = new JSONModel({
                    "cashData": cashData,
                    "grandTotal": 0
                });
                this.getView().setModel(oModel1, "CashModel");
    
                if (!this._oDialogPayment) {
                    Fragment.load({
                        name: "com.eros.advancepayment.fragment.payment",
                        controller: this
                    }).then(function(oFragment) {
                        this._oDialogPayment = oFragment;
                        sap.ui.getCore().byId("totalAmountText").setText(parseFloat(that.getView().byId("saleAmount").getValue()).toFixed(2));
                        this.getView().addDependent(this._oDialogPayment);
                        this._oDialogPayment.open();
                        this._oDialogCashier.close();
                    }.bind(this));
                } else {
                    this._oDialogPayment.open();
                    sap.ui.getCore().byId("totalAmountText").setText(parseFloat(that.getView().byId("saleAmount").getValue()).toFixed(2));
                    this._oDialogCashier.close();
                }
            }
            else{
                MessageBox.error("Kindly enter Customer Details");
            }
            },
            onOptionSelectPayment: function(oEvent){
                var sSelectedOption = oEvent.getSource().getTitle();
                var showSection = new JSONModel();
                showSection.setData({
                    "selectedMode": sSelectedOption,
                    "cardPaymentMode" : 0
                });
                if( sSelectedOption === "Cash"){
                    var cashModel = new JSONModel();
                    cashModel.setData({
                        "cash": [
                            {
                                "title": "1000",
                                "subtitle": "sap-icon://credit-card"
                            },
                            {
                                "title": "500",
                                "subtitle": "sap-icon://credit-card"
                            },
                            {
                                "title": "200",
                                "subtitle": "sap-icon://credit-card"
                            },
                            {
                                "title": "100",
                                "subtitle": "sap-icon://credit-card"
                            },
                            {
                                "title": "50",
                                "subtitle": "sap-icon://credit-card"
                            },
                            {
                                "title": "20",
                                "subtitle": "sap-icon://credit-card"
                            }
                            
                          
                        ]
                    })
                }
                this.getView().setModel(cashModel, "cashCurrencyModel");
                this.getView().setModel(showSection, "ShowPaymentSection");
            },
            onPressClose: function() {
                this._oDialogPayment.close();
            },
            onCashSubmit: function () {

                var cashAmount = sap.ui.getCore().byId("cash").getValue();
                this.paymentEntSourceCounter = this.paymentEntSourceCounter + 1;
                this.paymentId = this.paymentId + 1;
                var bFlag = false;
                var maxcount = "";
                if (this.aPaymentEntries.length > 0) {
                    for (var count = 0; count < this.aPaymentEntries.length; count++) {

                        if (this.aPaymentEntries[count].PaymentMethodName === "Cash") {
                            bFlag = true;
                            maxcount = count;
                            break;

                        }
                    }
                }
                if (cashAmount !== 0 && cashAmount !== "0.00") {

                    if (bFlag) {
                        this.aPaymentEntries[maxcount].Amount = parseFloat(this.aPaymentEntries[maxcount].Amount) + parseFloat(cashAmount)
                    }
                    else {
                        this.aPaymentEntries.push({
                            "TransactionId": this.getView().byId("tranNumber").getCount().toString(),
                            "PaymentId": this.paymentId.toString(),
                            "PaymentDate": new Date(),
                            "Amount": cashAmount.toString(),
                            "Currency": "AED",
                            "PaymentMethod": "011", //Cash( 011), card ("")
                            "PaymentMethodName": "Cash",
                            "Tid": "",
                            "Mid": "",
                            "CardType": "",
                            "CardLabel": "",
                            "CardNumber": "",
                            "AuthorizationCode": "",
                            "CardReceiptNo": "",
                            "PaymentType" : "CASH",
                            "VoucherNumber" : "",
                            "SourceId" : "" //this.getView().byId("tranNumber").getCount().toString() + this.paymentEntSourceCounter.toString()
                            

                        });
                    }

                    var saleAmount = sap.ui.getCore().byId("totalAmountText").getText();
                    var paidAmount = 0;
                    for (var count1 = 0; count1 < this.aPaymentEntries.length; count1++) {

                        paidAmount = parseFloat(parseFloat(this.aPaymentEntries[count1].Amount) + parseFloat(paidAmount)).toFixed(2);

                    }
                    var balanceAmount = parseFloat(parseFloat(saleAmount).toFixed(2) - parseFloat(paidAmount).toFixed(2)).toFixed(2);
                    if (balanceAmount <= 0) {
                        sap.ui.getCore().byId("totaltenderBal").setText(balanceAmount);
                        sap.ui.getCore().byId("totalSaleBalText").setText("0.00");
                        sap.ui.getCore().byId("sbmtTrans").setVisible(true);
                        sap.m.MessageToast.show("Cash Payment Successful");
                        that.onPressPaymentTest();
                    }
                    else {
                        sap.ui.getCore().byId("totalSaleBalText").setText(parseFloat(Math.abs(balanceAmount)).toFixed(2));
                        sap.ui.getCore().byId("cash").setValue("");
                        sap.ui.getCore().byId("sbmtTrans").setVisible(false);
                        sap.m.MessageToast.show("Cash Payment Successful");
                    }



                    //var tenderChangeAmount = this.getView().byId("totaltenderBal").getValue();

                }
            },
            onPressPaymentTest: function () {
                this.onPressPayment(true);
            },
            getTimeInISO8601Format: function () {
                const now = new Date();
                const hours = now.getHours();      // 24-hour format
                const minutes = now.getMinutes();
                const seconds = now.getSeconds();

                return `PT${hours}H${minutes}M${seconds}S`;
            },
            onPressPayment: function (bflag) {

                var mode = "1";
                var delDate = new Date();
                //var shippingMode = this.checkHomeDelivery();
                var custData = this.getView().getModel("custAddModel").getData();
                var contactNumber = "";
                custData.country_code ? custData.country_code : "" + custData.MobNo ? custData.MobNo : ""
                if (custData.country_code) {
                    contactNumber = contactNumber + custData.country_code;
                }
                if (custData.MobNo) {
                    contactNumber = contactNumber + custData.MobNo;
                }
              
                var that = this;
                var oPayload = {
                    "TransactionId": this.getView().byId("tranNumber").getCount().toString(),
                    "TransactionDate": new Date(),//new Date().toISOString().slice(0, 10).replace(/-/g, ''),
                    "ExpiryDate": new Date(),
                    "TransactionTime": this.getTimeInISO8601Format(),//new Date().toTimeString().slice(0, 8).replace(/:/g, ''),
                    "TransactionStatus": mode,
                    "SalesOrder": "",
                    "Flag": "",
                    "Store": that.storeID,
                    "Plant": that.plantID,
                    "CashierId": that.cashierID,
                    "CashierName": that.cashierName,
                    "TransactionType": "3",
                    "ShippingMethod": this.shippingMethod,
                    "GrossAmount": "0.00",
                    "Discount": "0.00",
                    "VatAmount": "0.00",
                    "SaleAmount": this.getView().byId("saleAmount").getValue().toString(),
                    "Currency": "AED",
                    "OriginalTransactionId": "", // Required for Return Sales
                    "CustomerName": this.getView().byId("customer").getCount().toString(),
                    "ContactNo": contactNumber,
                    "EMail": this.getView().getModel("custAddModel").getData().Email,
                    "Address": this.shippingAddress,
                    "ShippingInstruction": "",
                    "DeliveryDate": new Date(),
                    "ToItems": { "results": [] },
                    "ToDiscounts": { "results": [] },
                    "ToPayments": { "results": this.oPayloadPayments(this.aPaymentEntries) },
                    "ToSerials": { "results": [] },
                    "Remarks" : this.getView().byId("comments").getValue()
                    // "ToPayments" : {"results" : this.oPayloadTablePayments()}
                }

                this.oModel.create("/SalesTransactionHeaderSet", oPayload, {
                    success: function (oData) {
                        that.getView().setBusy(false);
                        if (oData) {
                            sap.m.MessageToast.show("Success");
                        }
                        if (!bflag) {
                            window.location.reload(true);
                        }
                    },
                    error: function (oError) {
                        that.getView().setBusy(false);
                        sap.m.MessageToast.show("Error");
                    }
                });

            },
            onRetrieveTerminal: function (oEvent) {
                this.cashAmount = oEvent.getParameter("value");
                var that = this;
                var aFilters = [];
                aFilters.push(new sap.ui.model.Filter("Store", sap.ui.model.FilterOperator.EQ, this.storeID));
                this.oModel.read("/TerminalsSet", {
                    filters: aFilters,
                    success: function (oData) {
                        that.getView().getModel("ShowPaymentSection").setProperty("/Terminal", []);
                        that.getView().getModel("ShowPaymentSection").setProperty("/Terminal", oData.results);

                    },
                    error: function (oError) {
                        sap.m.MessageBox.show(JSON.parse(oError.responseText).error.message.value, {
                            icon: sap.m.MessageBox.Icon.Error,
                            title: "Error",
                            actions: [MessageBox.Action.OK],
                            onClose: function (oAction) {
                                if (oAction === MessageBox.Action.OK) {

                                }
                            }
                        });
                    }
                });
            },
            onPressTenderCard: function (oEvent) {
                // var terminalID = oEvent.getParameter("srcControl").getAggregation("items")[0].getProperty("text")
                // var machindID = oEvent.getParameter("srcControl").getAggregation("items")[1].getProperty("text");

                var oItem = oEvent.getParameter("listItem") || oEvent.getSource();
                var oVBox = oItem.getContent ? oItem.getContent()[0] : oItem.getAggregation("content")[0];
                var aItems = oVBox.getItems ? oVBox.getItems() : oVBox.getAggregation("items");
                var terminalID = aItems[0]?.getText();
                var machineID = aItems[1]?.getText();
                this.initiateTransaction(terminalID, machineID);
            },
            initiateTransaction: function (termID, machID) {
                var that = this;
                sap.ui.core.BusyIndicator.show();
                // BusyDialog.open();
                var oPayload = {
                    "Tid": termID,
                    "Mid": machID,
                    "TransactionType": "pushPaymentSale",
                    "SourceId": this.getView().byId("tranNumber").getCount().toString() + this.sourceIdCounter.toString(),
                    "Amount": this.cashAmount.toString()

                }

                this.oModel.create("/PaymentStartTransactionSet", oPayload, {
                    success: function (oData) {
                        that.sourceIdCounter = that.sourceIdCounter + 1;
                        that.paymentEntSourceCounter = that.paymentEntSourceCounter + 1;
                        sap.ui.getCore().byId("creditAmount").setValue("");
                        that.getView().getModel("ShowPaymentSection").setProperty("/Terminal", []);
                        that.getView().getModel("ShowPaymentSection").refresh();
                        sap.ui.core.BusyIndicator.hide();
                        that.paymentId = that.paymentId + 1;
                        that.getView().setBusy(false);
                        that.aPaymentEntries.push({
                            "TransactionId": that.getView().byId("tranNumber").getCount().toString(),
                            "PaymentId": that.paymentId.toString(),
                            "PaymentDate": new Date(),
                            "Amount": oData.Amount,
                            "Currency": "AED",
                            "PaymentMethod": "",
                            "PaymentMethodName": "Card",
                            "Tid": oData.Tid,
                            "Mid": oData.Mid,
                            "CardType": oData.CardType,
                            "CardLabel": oData.CardLabel,
                            "CardNumber": oData.CardNumber,
                            "AuthorizationCode": oData.AuthorizationCode,
                            "CardReceiptNo": oData.CardReceiptNo,
                            "PaymentType" : "CARD",
                            "VoucherNumber" : "" ,
                            "SourceId" : that.getView().byId("tranNumber").getCount().toString() + that.paymentEntSourceCounter.toString()
                            

                        });
                        
                        var saleAmount = sap.ui.getCore().byId("totalAmountText").getText();
                        var paidAmount = 0;
                        for (var count1 = 0; count1 < that.aPaymentEntries.length; count1++) {

                            paidAmount = parseFloat(parseFloat(that.aPaymentEntries[count1].Amount) + parseFloat(paidAmount)).toFixed(2);

                        }
                        var balanceAmount = parseFloat(parseFloat(saleAmount).toFixed(2) - parseFloat(paidAmount).toFixed(2)).toFixed(2);
                        if (balanceAmount <= 0) {
                            sap.ui.getCore().byId("totaltenderBal").setText(balanceAmount);
                            sap.ui.getCore().byId("totalSaleBalText").setText("0.00");
                            sap.ui.getCore().byId("sbmtTrans").setVisible(true);
                            that.onPressPaymentTest();
                        }
                        else {
                            sap.ui.getCore().byId("totalSaleBalText").setText(parseFloat(Math.abs(balanceAmount)).toFixed(2));
                            sap.ui.getCore().byId("cash").setValue("");
                            sap.ui.getCore().byId("sbmtTrans").setVisible(false);
                        }


                        sap.m.MessageToast.show("Card Payment Successful");

                    },
                    error: function (oError) {
                        that.sourceIdCounter = that.sourceIdCounter + 1;
                        var errMessage = "";
                        sap.ui.core.BusyIndicator.hide();
                        if (JSON.parse(oError.responseText).error.message.value) {
                            errMessage = JSON.parse(oError.responseText).error.message.value;
                        }
                        else {
                            errMessage = "Error During Payment Transaction "
                        }

                        sap.m.MessageBox.show(errMessage, {
                            icon: sap.m.MessageBox.Icon.Error,
                            title: "Error",
                            actions: [MessageBox.Action.OK],
                            onClose: function (oAction) {

                            }
                        });


                    }
                });
            },
            onSelectCardType: function(oEvent){
                var oSelectedItem = oEvent.getParameter("listItem").getBindingContext().getObject();
                this.selectedCardData = oSelectedItem;
                this.selectedCardType = oSelectedItem.CardType;
                this.selectedCardPayMethodName = oSelectedItem.PaymentMethodName;
                this.selectedCardPayMethod =  oSelectedItem.PaymentMethod;

                this._oDialogCardType = null;
                if (!this._oDialogCardType) {
                    this._oDialogCardType = new sap.m.Dialog({
                                            title: this.selectedCardType,
                                            content: [],
                                     beginButton: new sap.m.Button({
                                                      text: "Submit",
                                                        press: this.onSubmitCardType.bind(this)
                                                    }),
                                    endButton: new sap.m.Button({
                                                    text: "Cancel",
                                                    press: function () {
                                                            this._oDialogCardType.close();
                                                                }.bind(this)
        })
    });
    this._oAmountCardInput = new sap.m.Input({
        placeholder: "Enter Amount",
        type: "Number",
        width: "60%"
    }).addStyleClass("sapUiSmallMarginBegin  sapUiSmallMarginTop sapUiSmallMarginBottom");

    this._oSelectCardLabel = new sap.m.Input({
        placeholder: "Enter Card Label",
        width: "60%"
    }).addStyleClass("sapUiSmallMarginBegin  sapUiTinyMarginTop sapUiSmallMarginBottom");

    this._oSelectCardApproval = new sap.m.Input({
        placeholder: "Enter Approval Code",
        width: "60%"
    }).addStyleClass("sapUiSmallMarginBegin  sapUiTinyMarginTop sapUiSmallMarginBottom");

    this._oSelectCardReciept = new sap.m.Input({
        placeholder: "Enter Card Reciept Number",
        width: "60%"
    }).addStyleClass("sapUiSmallMarginBegin  sapUiTinyMarginTop sapUiSmallMarginBottom");

    this._oDialogCardType.addContent(this._oAmountCardInput);
    this._oDialogCardType.addContent(this._oSelectCardLabel);
    this._oDialogCardType.addContent(this._oSelectCardApproval);
    this._oDialogCardType.addContent(this._oSelectCardReciept);
    this.getView().addDependent(this._oDialogCardType);
}

// Clear previous input
this._oAmountCardInput.setValue("");
this._oSelectCardLabel.setValue("");
this._oSelectCardApproval.setValue("");
this._oSelectCardReciept.setValue("");

this._oDialogCardType.open();
                // sap.ui.getCore().byId("manCardAmount").setValue("");
                // sap.ui.getCore().byId("manCardNumber").setValue("");
                // sap.ui.getCore().byId("manCardApproveCode").setValue("");
                // sap.ui.getCore().byId("manCardReciept").setValue("");
            },
            onSubmitCardType: function(){
                var that = this;
                var sAmount = that._oAmountCardInput.getValue();
                var sCardLabel = that._oSelectCardLabel.getValue();
                var sCardApproval = that._oSelectCardApproval.getValue();
                var sCardReciept = that._oSelectCardReciept.getValue();
                that.paymentEntSourceCounter = that.paymentEntSourceCounter + 1;
                that.paymentId = that.paymentId + 1;
            
                if (!sAmount) {
                    sap.m.MessageToast.show("Please enter an amount");
                    return;
                }
                if(!sCardLabel){
                    sap.m.MessageToast.show("Please enter Card Label");
                    return;
                }
                if (!sCardApproval) {
                    sap.m.MessageToast.show("Please enter Card Approval Code");
                    return;
                }
                if(!sCardReciept){
                    sap.m.MessageToast.show("Please enter Card Reciept Number");
                    return;
                }

                that.aPaymentEntries.push({
                    "TransactionId": that.getView().byId("tranNumber").getCount().toString(),
                    "PaymentId": that.paymentId.toString(),
                    "PaymentDate": new Date(),
                    "Amount": sAmount.toString(),
                    "Currency": "AED",
                    "PaymentMethod": that.selectedCardPayMethod,
                    "PaymentMethodName": that.selectedCardPayMethodName,
                    "Tid": "",
                    "Mid": "",
                    "CardType": "",
                    "CardLabel": "",
                    "CardNumber": "",
                    "AuthorizationCode": "",
                    "CardReceiptNo": "",
                    "PaymentType" : "CARD",
                    "VoucherNumber" : "",
                    "SourceId" : "" //that.getView().byId("tranNumber").getCount().toString() + that.paymentEntSourceCounter.toString()
                    

                });

                var saleAmount = sap.ui.getCore().byId("totalAmountText").getText();
                var paidAmount = 0;
                for (var count1 = 0; count1 < this.aPaymentEntries.length; count1++) {

                    paidAmount = parseFloat(parseFloat(this.aPaymentEntries[count1].Amount) + parseFloat(paidAmount)).toFixed(2);

                }
                var balanceAmount = parseFloat(parseFloat(saleAmount).toFixed(2) - parseFloat(paidAmount).toFixed(2)).toFixed(2);
                if (balanceAmount <= 0) {
                    sap.ui.getCore().byId("totaltenderBal").setText(balanceAmount);
                    sap.ui.getCore().byId("totalSaleBalText").setText("0.00");
                    sap.ui.getCore().byId("sbmtTrans").setVisible(true);
                    sap.m.MessageToast.show("Manual Card Payment Successful");
                    that.onPressPaymentTest();
                }
                else {
                    sap.ui.getCore().byId("totalSaleBalText").setText(parseFloat(Math.abs(balanceAmount)).toFixed(2));
                    sap.ui.getCore().byId("cash").setValue("");
                    sap.ui.getCore().byId("sbmtTrans").setVisible(false);
                    sap.m.MessageToast.show("Manual Card Payment Successful");
                }
            this._oDialogCardType.close();

            },
            onSelectNonGV: function(oEvent){
                var oSelectedItem = oEvent.getParameter("listItem").getBindingContext().getObject();
                this._oSelectedReason = oSelectedItem; // Store the clicked item globally
                this.nonGVPaymentMethod = oSelectedItem.PaymentMethod;
                this.nonGVPaymentMethodName = oSelectedItem.PaymentMethodName;
                // var oInput = new sap.m.Input({
                //     placeholder: "Enter Amount",
                //     type: "Number",
                //     width:"60%"
                // }).addStyleClass("sapUiSmallMarginBegin  sapUiSmallMarginTop sapUiSmallMarginBottom");
                this._oDialogNonGV = null;
                if (!this._oDialogNonGV) {
                        this._oDialogNonGV = new sap.m.Dialog({
                                                title: this.nonGVPaymentMethodName,
                                                content: [],
                                         beginButton: new sap.m.Button({
                                                          text: "Submit",
                                                            press: this.onSubmitAmount.bind(this)
                                                        }),
                                        endButton: new sap.m.Button({
                                                        text: "Cancel",
                                                        press: function () {
                                                                this._oDialogNonGV.close();
                                                                    }.bind(this)
            })
        });
        this._oAmountInput = new sap.m.Input({
            placeholder: "Enter Amount",
            type: "Number",
            width: "60%"
        }).addStyleClass("sapUiSmallMarginBegin  sapUiSmallMarginTop sapUiSmallMarginBottom");

        this._oVoucherNumber = new sap.m.TextArea({
            placeholder: "Enter Voucher Number",
            type: "Number",
            width: "60%"
        }).addStyleClass("sapUiSmallMarginBegin  sapUiTinyMarginTop sapUiSmallMarginBottom");

        this._oDialogNonGV.addContent(this._oAmountInput);
        this._oDialogNonGV.addContent(this._oVoucherNumber);
        this.getView().addDependent(this._oDialogNonGV);
    }

    // Clear previous input
    this._oAmountInput.setValue("");
    this._oVoucherNumber.setValue("");

    this._oDialogNonGV.open();
            },
    onSubmitAmount: function() {
                var that = this;
                var sAmount = that._oAmountInput.getValue();
                var sVoucherNumber = that._oVoucherNumber.getValue();
                that.paymentId = that.paymentId + 1;
                that.paymentEntSourceCounter = that.paymentEntSourceCounter + 1;
            
                if (!sAmount) {
                    sap.m.MessageToast.show("Please enter an amount");
                    return;
                }
                if(!sVoucherNumber){
                    sap.m.MessageToast.show("Please enter Voucher Number");
                    return;
                }

                that.aPaymentEntries.push({
                    "TransactionId": that.getView().byId("tranNumber").getCount().toString(),
                    "PaymentId": that.paymentId.toString(),
                    "PaymentDate": new Date(),
                    "Amount": sAmount.toString(),
                    "Currency": "AED",
                    "PaymentMethod": that.nonGVPaymentMethod,
                    "PaymentMethodName": that.nonGVPaymentMethodName,
                    "Tid": "",
                    "Mid": "",
                    "CardType": "",
                    "CardLabel": "",
                    "CardNumber": "",
                    "AuthorizationCode": "",
                    "CardReceiptNo": "",
                    "PaymentType" : "NEGV",
                    "VoucherNumber" : sVoucherNumber,
                    "SourceId" : "" //that.getView().byId("tranNumber").getCount().toString() + that.paymentEntSourceCounter.toString()
                    

                });

                var saleAmount = sap.ui.getCore().byId("totalAmountText").getText();
                    var paidAmount = 0;
                    for (var count1 = 0; count1 < this.aPaymentEntries.length; count1++) {

                        paidAmount = parseFloat(parseFloat(this.aPaymentEntries[count1].Amount) + parseFloat(paidAmount)).toFixed(2);

                    }
                    var balanceAmount = parseFloat(parseFloat(saleAmount).toFixed(2) - parseFloat(paidAmount).toFixed(2)).toFixed(2);
                    if (balanceAmount <= 0) {
                        sap.ui.getCore().byId("totaltenderBal").setText(balanceAmount);
                        sap.ui.getCore().byId("totalSaleBalText").setText("0.00");
                        sap.ui.getCore().byId("sbmtTrans").setVisible(true);
                        sap.m.MessageToast.show("Non EGV Payment Successful");
                        that.onPressPaymentTest();
                    }
                    else {
                        sap.ui.getCore().byId("totalSaleBalText").setText(parseFloat(Math.abs(balanceAmount)).toFixed(2));
                        sap.ui.getCore().byId("cash").setValue("");
                        sap.ui.getCore().byId("sbmtTrans").setVisible(false);
                        sap.m.MessageToast.show("Non EGV Payment Successful");
                    }
                this._oDialogNonGV.close();
            },
            oPayloadPayments: function (arrPayment) {
                if (arrPayment.length > 0) {
                    return arrPayment.map(item => {
                        return {
                            ...item,
                            Amount: item.Amount.toString()
                        };
                    });
                }
                else {
                    return [];
                }
            },
            onSubmitNonGV: function(){
                var oMultiInput = sap.ui.getCore().byId("multiInput");
                var aTokens = oMultiInput.getTokens();
                var fTotalAmount = 0;
            
                aTokens.forEach(function(oToken) {
                    var sTokenText = oToken.getText(); // Example: "Reason1 - 500"
                    var aParts = sTokenText.split("-");
                    
                    if (aParts.length === 2) {
                        var sAmt = aParts[1].trim(); // Take second part and remove spaces
                        var fAmt = parseFloat(sAmt);
            
                        if (!isNaN(fAmt)) {
                            fTotalAmount += fAmt;
                        }
                    }
                });
            
                // Show total in a MessageToast (you can bind it to a Text field also)
                sap.m.MessageToast.show("Total Amount: " + fTotalAmount);
            },
            onEnterAmount: function(oEvent){
                this.getView().byId("saleAmountIcon").setCount(oEvent.getParameter("value").toString())
            }
        });
    });
