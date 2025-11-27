sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment",
    "sap/m/MessageBox",
    "com/eros/advancepayment/lib/epos-2.27.0"

],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, JSONModel, MessageToast, Fragment, MessageBox,epson2) {
        "use strict";
        var that;
        return Controller.extend("com.eros.advancepayment.controller.AdvPaymentCancel", {
            onInit: function () {
                that = this;
                $("body").css("zoom", "90%");
                this.getView().byId("page").setVisible(false);
                this.oModel = this.getOwnerComponent().getModel();
                this.oModel.setSizeLimit(1000);
                this.customerAddressModel = new JSONModel();
                this.getView().setModel(this.customerAddressModel, "custAddModel");

                this.customerModel = this.getOwnerComponent().getModel("customerService");
                this.getView().setModel(this.customerModel, "CustomerModel");

                var showSection = new JSONModel();
                showSection.setData({
                    "selectedMode": ""
                });
                this.getView().setModel(showSection, "ShowSection");

                var model3 = new JSONModel();
                model3.setData({
                    "selectedMode": "",
                    "cardPaymentMode": 0
                });
                this.getView().setModel(model3, "ShowPaymentSection");
                this.validateLoggedInUser();
                this.shippingMethod = "";
                this.paymentEntSourceCounter = 0;
                this.paymentId = 0;
                this.sourceIdCounter = 0;
                this.aPaymentEntries = [];
                this.cashierID ="";
                this.CashierPwd="";
            },
             enableValidateBtn: function(oEvent){
                if(oEvent.getSource().getId() === "cashId"){
                    this.cashierID = oEvent.getSource().getValue();
                }
                else if(oEvent.getSource().getId() === "casPwd"){
                    this.CashierPwd = oEvent.getSource().getValue();
                }

                
                if(this.cashierID.length > 0 && this.CashierPwd.length > 0){
                    sap.ui.getCore().byId("validatebtn").setEnabled(true);
                }
                else{
                    sap.ui.getCore().byId("validatebtn").setEnabled(false);
                }
            },
            validateLoggedInUser: function () {
                var that = this;
                that.printerIP = [];
                this.oModel.read("/StoreIDSet", {
                    success: function (oData) {
                        that.storeID = oData.results[0] ? oData.results[0].Store : "";
                        that.plantID = oData.results[0] ? oData.results[0].Plant : "";
                        that.printerIP.push(oData.results[0] ? oData.results[0].PrinterIp1 ? oData.results[0].PrinterIp1 : "" : "");
                        that.printerIP.push(oData.results[0] ? oData.results[0].PrinterIp2 ? oData.results[0].PrinterIp2 : "" : "");
                        that.printerIP.push(oData.results[0] ? oData.results[0].PrinterIp3 ? oData.results[0].PrinterIp3 : "" : "");
                        that.onPressPayments();
                    },
                    error: function (oError) {
                        sap.m.MessageBox.show(JSON.parse(oError.responseText).error.message.value, {
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
            onPressPayments: function () {
                if (!this._oDialogCashier) {
                    Fragment.load({
                        name: "com.eros.advancepayment.fragment.cashier",
                        controller: this
                    }).then(function (oFragment) {
                        this._oDialogCashier = oFragment;
                        this.getView().addDependent(this._oDialogCashier);
                        this._oDialogCashier.open();
                    }.bind(this));
                } else {
                    this._oDialogCashier.open();
                }
            },
            fnCloseCashier: function () {
                this._oDialogCashier.close();
            },
            fnValidateCashier: function (oEvent) {
                var that = this;
                that.getView().byId("page").setVisible(false);
                var empId = oEvent.getSource().getParent().getContent()[0].getItems()[0].getContent()[1].getValue();
                var pwd = oEvent.getSource().getParent().getContent()[0].getItems()[0].getContent()[3].getValue();
                var aFilters = [];

                aFilters.push(new sap.ui.model.Filter("Etype", sap.ui.model.FilterOperator.EQ, "C"));
                aFilters.push(new sap.ui.model.Filter("EmployeeId", sap.ui.model.FilterOperator.EQ, empId));
                aFilters.push(new sap.ui.model.Filter("SecretCode", sap.ui.model.FilterOperator.EQ, pwd));
                aFilters.push(new sap.ui.model.Filter("Generate", sap.ui.model.FilterOperator.EQ, "N"));
                //EmployeeSet?$filter=Etype eq 'C' and EmployeeId eq '112' and SecretCode eq 'Abc#91234'

                this.oModel.read("/EmployeeSet", {
                    filters: aFilters,
                    success: function (oData) {
                        that.cashierID = oData.results[0] ? oData.results[0].EmployeeId : "";
                        that.cashierName = oData.results[0] ? oData.results[0].EmployeeName : "";
                        that._oDialogCashier.close();
                        that.getView().byId("cashier").setCount(oData.results[0].EmployeeName);
                        that.getView().byId("tranNumber").setCount(oData.results[0].TransactionId);
                        that.getView().byId("page").setVisible(true);

                    },
                    error: function (oError) {
                        that.getView().byId("page").setVisible(false);
                        if (JSON.parse(oError.responseText).error.code === "CASHIER_CHECK") {
                            sap.m.MessageBox.show(
                                JSON.parse(oError.responseText).error.message.value, {
                                icon: sap.m.MessageBox.Icon.Error,
                                title: "Cashier Validation",
                                actions: ["OK", "CANCEL"],
                                onClose: function (oAction) {

                                }
                            }
                            );
                        }
                        else {
                            sap.m.MessageBox.show(
                                JSON.parse(oError.responseText).error.message.value, {
                                icon: sap.m.MessageBox.Icon.Error,
                                title: "Error",
                                actions: ["OK", "CANCEL"],
                                onClose: function (oAction) {

                                }
                            }
                            );
                        }
                        console.error("Error", oError);
                    }
                });

            },
            onPressCustData: function () {
                var oModel = new sap.ui.model.json.JSONModel({
                    customerData: [{
                        option: "Basic Information"
                    }, {
                        option: "Customer Address"
                    }]
                });
                this.getView().setModel(oModel, "CustModel");
                if (!this._oDialogCust) {
                    Fragment.load({
                        name: "com.eros.advancepayment.fragment.customer",
                        controller: this
                    }).then(function (oFragment) {
                        this._oDialogCust = oFragment;
                        this.getView().addDependent(this._oDialogCust);
                        this._oDialogCust.open();
                    }.bind(this));
                } else {
                    this._oDialogCust.open();
                }

            },
            onPressCustClose: function () {
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

                if (custData.ShippingMethod === 0) {
                    this.shippingMethod = "HD";
                } else if (custData.ShippingMethod === 1) {
                    this.shippingMethod = "HA";
                } else if (custData.ShippingMethod === 2) {
                    this.shippingMethod = "HP";
                }

                if (custData.FirstName) {
                    customerName.push(custData.FirstName);
                }
                if (custData.LastName) {
                    customerName.push(custData.LastName);
                }
                var custName = customerName.join(" ");
                this.getView().byId("customer").setCount(custName);
                var selAddIndex = sap.ui.getCore().byId("addressRbGrp").getSelectedIndex();
                if (selAddIndex === 0) {

                    if (custData.HomeAddressLine1) {
                        addressParts.push(custData.HomeAddressLine1);
                    }
                    if (custData.HomeAddressLine2) {
                        addressParts.push(custData.HomeAddressLine2);
                    }
                    if (custData.HomeStreet) {
                        addressParts.push(custData.HomeStreet);
                    }
                    if (custData.HomeCity) {
                        addressParts.push(custData.HomeCity);
                    }
                    if (custData.HomeCountry) {
                        addressParts.push(custData.HomeCountry);
                    }

                }
                else if (selAddIndex === 1) {

                    if (custData.OfficeAddressLine1) {
                        addressParts.push(custData.OfficeAddressLine1);
                    }
                    if (custData.OfficeAddressLine2) {
                        addressParts.push(custData.OfficeAddressLine2);
                    }
                    if (custData.OfficeStreet) {
                        addressParts.push(custData.OfficeStreet);
                    }
                    if (custData.off_City) {
                        addressParts.push(custData.OfficeCity);
                    }
                    if (custData.off_Country) {
                        addressParts.push(custData.OfficeCountry);
                    }



                } else {

                    if (custData.OtherAddressLine1) {
                        addressParts.push(custData.OtherAddressLine1);
                    }
                    if (custData.OtherAddressLine2) {
                        addressParts.push(custData.OtherAddressLine2);
                    }
                    if (custData.oth_po) {
                        addressParts.push(custData.OtherStreet);
                    }
                    if (custData.oth_City) {
                        addressParts.push(custData.OtherCity);
                    }
                    if (custData.oth_Country) {
                        addressParts.push(custData.OtherCountry);
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
                if (!custData.FirstName || custData.FirstName.trim() === "") {
                    errorMessage += "First Name is required.\n";
                }
                if (!custData.Code || custData.Code.trim() === "") {
                    errorMessage += "Country Code is required.\n";
                }
                if (!custData.Mobile || custData.Mobile.trim() === "") {
                    errorMessage += "Mobile Number is required.\n";
                }
                if (!custData.CustomerType || custData.CustomerType.trim() === "") {
                    errorMessage += "Customer Type is required.\n";
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


                var birthDate = sap.ui.getCore().byId("birthDate").getValue();
      

                if (birthDate) {
                    data.BirthDate = new Date(birthDate);
                }
                else {
                    data.BirthDate = null;
                }
               
                    data.IdentityExpiry = null;
              
                this.oModel.create("/CustomerSet", data, {
                    success: function (oData) {
                        that._oDialogCust.close();
                        sap.m.MessageToast.show("Customer Update Successfully");
                    },
                    error: function (oError) {
                        sap.m.MessageToast.show("Error while Updating Customer");

                    }
                });

            },
            onOptionSelect: function (oEvent) {
                var sSelectedOption = oEvent.getSource().getTitle();
                var showSection = new JSONModel();
                showSection.setData({
                    "selectedMode": sSelectedOption
                });
                this.getView().setModel(showSection, "ShowSection");
                //	sap.m.MessageToast.show("Selected: " + sSelectedOption);
            },
            onSearchNumber: function (oEvent) {
                var that = this;
                var searchNumber = oEvent.getParameter("query");
                var aFilters = [];

                aFilters.push(new sap.ui.model.Filter("Mobile", sap.ui.model.FilterOperator.EQ, searchNumber));
                this.oModel.read("/CustomerSet", {
                    filters: aFilters,
                    success: function (oData) {
                        if (oData) {

                            if (oData.results.length > 0) {
                                // this.getView().setModel(oModel1, "AddressModel");
                                that.getView().getModel("custAddModel").setData({});
                                that.getView().getModel("custAddModel").setData(oData.results[0]);
                                that.getView().getModel("custAddModel").refresh();
                                that.getView().getModel("ShowSection").setProperty("/selectedMode", "Basic Information");

                                if ((oData.HomeAddressLine1 !== "") || (oData.HomeAddressLine2 !== "")) {
                                    sap.ui.getCore().byId("addressRbGrp").setSelectedIndex(0);
                                }
                                else if ((oData.OfficeAddressLine1 !== "") || (oData.OfficeAddressLine2 !== "")) {
                                    sap.ui.getCore().byId("addressRbGrp").setSelectedIndex(1);

                                }
                                else if ((oData.OtherAddressLine1 !== "") || (oData.OtherAddressLine2 !== "")) {
                                    sap.ui.getCore().byId("addressRbGrp").setSelectedIndex(2);

                                }
                                else {
                                    sap.ui.getCore().byId("addressRbGrp").setSelectedIndex(0);
                                }


                            }
                            else {
                                that.showCustomerNotExistMessage();
                            }

                        }
                    },
                    error: function (oError) {
                        that.showCustomerNotExistMessage();
                    }
                });
            },
            showCustomerNotExistMessage: function () {
                sap.m.MessageBox.show("Customer does not exist. Kindly add it", {
                    icon: sap.m.MessageBox.Icon.Error,
                    title: "Error",
                    actions: [MessageBox.Action.OK],
                    onClose: function (oAction) {
                        if (oAction === MessageBox.Action.OK) {
                            that.getView().getModel("custAddModel").setData({});
                            that.getView().getModel("ShowSection").setProperty("/selectedMode", "Basic Information");
                        }
                    }
                });
            },
            onSelectAddressType: function (oEvent) {
                if (oEvent.getParameter("selectedIndex") === 0) {
                    sap.ui.getCore().byId("homeSection").setVisible(true);
                    sap.ui.getCore().byId("workSection").setVisible(false);
                    sap.ui.getCore().byId("otherSection").setVisible(false);
                }
                if (oEvent.getParameter("selectedIndex") === 1) {
                    sap.ui.getCore().byId("homeSection").setVisible(false);
                    sap.ui.getCore().byId("workSection").setVisible(true);
                    sap.ui.getCore().byId("otherSection").setVisible(false);
                }
                if (oEvent.getParameter("selectedIndex") === 2) {
                    sap.ui.getCore().byId("homeSection").setVisible(false);
                    sap.ui.getCore().byId("workSection").setVisible(false);
                    sap.ui.getCore().byId("otherSection").setVisible(true);
                }
            },
            onCustomerTypeChange: function (oEvent) {
                var that = this;

                if (oEvent.getParameter("selectedItem").getProperty("key") === "TOURIST") {
                   
                    that.getView().getModel("custAddModel").setProperty("/Code", "");
                }
                else {
                    
                    that.getView().getModel("custAddModel").setProperty("/Code", "971");
                }

            },
            validCustomer: function () {
                var entered = this.getView().byId("customer").getCount();
                if (entered) {
                    return true;
                }
                else {
                    return false
                }

            },
            onPressPayments1: function () {
                var checkCustomer = this.validCustomer();
                if (checkCustomer) {

                    var oModel = new sap.ui.model.json.JSONModel({
                        totalAmount: "0.00",
                        paymentOptions: [{
                            option: "Cash"
                        }, {
                            option: "Card"
                        }, {
                            option: "Non-GV"
                        },
                        {
                            option: "EGV"
                        },{
                            option :"View All Records"
                        }]
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
                        }).then(function (oFragment) {
                            this._oDialogPayment = oFragment;
                            this.getView().getModel("ShowPaymentSection").setProperty("/selectedMode","");
                            sap.ui.getCore().byId("totalAmountText").setText(parseFloat(that.getView().byId("inpAdvanceReciept").getValue()).toFixed(2));
                            this.getView().addDependent(this._oDialogPayment);
                            sap.ui.getCore().byId("cashSbmtBtn").setEnabled(true);
                            this._oDialogPayment.open();
                            this._oDialogCashier.close();
                        }.bind(this));
                    } else {
                        this.getView().getModel("ShowPaymentSection").setProperty("/selectedMode","");
                        sap.ui.getCore().byId("cashSbmtBtn").setEnabled(true);
                        this._oDialogPayment.open();
                        sap.ui.getCore().byId("totalAmountText").setText(parseFloat(that.getView().byId("inpAdvanceReciept").getValue()).toFixed(2));
                        this._oDialogCashier.close();
                    }
                }
                else {
                    MessageBox.error("Kindly enter Customer Details");
                }
            },
            onOptionSelectPayment: function (oEvent) {
                var sSelectedOption = oEvent.getSource().getTitle();
                var showSection = new JSONModel();
                showSection.setData({
                    "selectedMode": sSelectedOption,
                    "cardPaymentMode": 0
                });
                if (sSelectedOption === "Cash") {
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
                if (this.getView().getModel("GiftVoucher")) {
                    this.getView().getModel("GiftVoucher").setData({});
                    sap.ui.getCore().byId("gvPaymentList").setVisible(false);
                    sap.ui.getCore().byId("giftVoucher").setValue("");
                }
                 if (sSelectedOption === "View All Records"){
                    this.getView().getModel("ShowPaymentSection").setProperty("/allEntries",this.aPaymentEntries)
                }
            },
            onPressClose: function () {
                this._oDialogPayment.close();
            },
            onCashSubmit: function (oEvent) {
                var event = oEvent.getSource();
                var cashAmount = sap.ui.getCore().byId("cash").getValue();
                this.paymentEntSourceCounter = this.paymentEntSourceCounter + 1;
                this.paymentId = this.paymentId + 1;
                var bFlag = false;
                var maxcount = "";
                // if (this.aPaymentEntries.length > 0) {
                //     for (var count = 0; count < this.aPaymentEntries.length; count++) {

                //         if (this.aPaymentEntries[count].PaymentMethodName === "Cash") {
                //             bFlag = true;
                //             maxcount = count;
                //             break;

                //         }
                //     }
                // }
                if (cashAmount !== 0 && cashAmount !== "0.00") {

                    // if (bFlag) {
                    //     this.aPaymentEntries[maxcount].Amount = parseFloat(this.aPaymentEntries[maxcount].Amount) + parseFloat(cashAmount)
                    // }
                    // else {
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
                            "PaymentType": "CASH",
                            "VoucherNumber": "",
                            "SourceId": "" //this.getView().byId("tranNumber").getCount().toString() + this.paymentEntSourceCounter.toString()


                        });
                    // }

                    var saleAmount = sap.ui.getCore().byId("totalAmountText").getText();
                    var paidAmount = 0;
                    for (var count1 = 0; count1 < this.aPaymentEntries.length; count1++) {

                        paidAmount = parseFloat(parseFloat(this.aPaymentEntries[count1].Amount) + parseFloat(paidAmount)).toFixed(2);

                    }
                    var balanceAmount = parseFloat(parseFloat(saleAmount).toFixed(2) - parseFloat(paidAmount).toFixed(2)).toFixed(2);
                    if (balanceAmount <= 0) {
                        sap.ui.getCore().byId("totaltenderBal").setText(balanceAmount);
                        sap.ui.getCore().byId("totalSaleBalText").setText("0.00");
                        // sap.ui.getCore().byId("sbmtTrans").setVisible(true);
                        event.setEnabled(false);
                        sap.m.MessageToast.show("Cash Payment Successful");
                        that.onPressPaymentTest();
                    }
                    else {
                        sap.ui.getCore().byId("totalSaleBalText").setText(parseFloat(Math.abs(balanceAmount)).toFixed(2));
                        sap.ui.getCore().byId("cash").setValue("");
                        // sap.ui.getCore().byId("sbmtTrans").setVisible(false);
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
                custData.Code ? custData.Code : "" + custData.Mobile ? custData.Mobile : ""
                if (custData.Code) {
                    contactNumber = contactNumber + custData.Code;
                }
                if (custData.Mobile) {
                    contactNumber = contactNumber + custData.Mobile;
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
                    "SaleAmount": this.getView().byId("inpAdvanceReciept").getValue().toString(),
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
                    "Remarks": this.getView().byId("comments").getValue(),
                    "ToSignature": { "results": this.oPaySignatureload },
                    "CustomerType": that.oPayload.CustomerType,
                    // "ToPayments" : {"results" : this.oPayloadTablePayments()}
                }
                this.getView().setBusy(true);
                this._oDialogPayment.setBusy(true);
                this.oModel.create("/SalesTransactionHeaderSet", oPayload, {
                    success: function (oData) {
                        that.getView().setBusy(false);
                        that._oDialogPayment.setBusy(false);
                        that.getView().byId("tranNumber").setCount(oData.TransactionId);
                        
                        MessageBox.success("Advance Payment Posted Successfully.", {
                            onClose: function (sAction) {
                                //that.onOpenPrinterDialog();
                                window.location.reload(true);
                            }
                        });
                    },
                    error: function (oError) {
                        that.getView().setBusy(false);
                        that._oDialogPayment.setBusy(false);
                        sap.m.MessageToast.show("Error");
                    }
                });

            },
               onOpenPrinterDialog: function () {
                var that = this;

                // 1️⃣ Filter out blank IP addresses
                var aValidIPs = (that.printerIP || []).filter(function (ip) {
                    return ip && ip.trim() !== "";
                });

                if (aValidIPs.length === 0) {
                    sap.m.MessageToast.show("No valid printer IPs found.");
                    return;
                }

                // 2️⃣ Create JSON Model for GridList
                var oIPModel = new sap.ui.model.json.JSONModel({
                    IPs: aValidIPs.map(function (ip) {
                        return { IP: ip };
                    })
                });
                var oSignBox = sap.ui.core.Fragment.byId("SignaturePad", "signBox");
                oSignBox.setVisible(false);
                var ipBox = sap.ui.core.Fragment.byId("SignaturePad", "ipBox");
                ipBox.setVisible(true);
                this._pAddRecordDialog.setModel(oIPModel, "IPModel");

            },
            onPressIP: function (oEvent) {
                var that = this;
                var oItem = oEvent.getParameter("listItem") || oEvent.getSource();
                var oVBox = oItem.getContent ? oItem.getContent()[0] : oItem.getAggregation("content")[0];
                var aItems = oVBox.getItems ? oVBox.getItems() : oVBox.getAggregation("items");
                this.printIP = aItems[0]?.getText();
                var tranNumber = this.getView().byId("tranNumber").getCount().toString();
                var sPath = "/PrintPDFSet(TransactionId='" + tranNumber + "',PDFType='A')";
                 if (that._pAddRecordDialog) {
                                    that._pAddRecordDialog.setBusy(true);
                                }
                this.oModel.read(sPath, {
                    urlParameters: { "$expand": "ToPDFList" },
                    success: async function (oData) {
                        that.aPrintBase64 = oData.ToPDFList.results;
                        var aResults = oData.ToPDFList.results;

                        var oPrintBox = sap.ui.core.Fragment.byId("SignaturePad", "printBox");
                        oPrintBox.setVisible(true);
                        var oHtmlControl = sap.ui.core.Fragment.byId("SignaturePad", "pdfCanvas");
                        var iframeContent = '<div id="pdf-viewport"></div>';
                        oHtmlControl.setContent(iframeContent);
                        oHtmlControl.invalidate(); // force re-render
                        sap.ui.getCore().applyChanges(); // immediately render changes
                        oHtmlControl.setVisible(true);
                        const pdfContainer = document.getElementById("pdf-viewport");
                        console.log("PDF container:", pdfContainer);
                        that.aCanvas = [];


                        if (aResults && aResults.length > 0) {
                            // Sort by sequence if needed
                            aResults.sort((a, b) => parseInt(a.SequenceId) - parseInt(b.SequenceId));

                            for (const oRow of aResults) {
                                await that.showPDF(oRow.Value);
                                 if (that._pAddRecordDialog) {
                                    that._pAddRecordDialog.setBusy(false);
                                }
                            }


                        } else {
                            sap.m.MessageToast.show("No PDF data available.");
                        }



                    },
                    error: function () {
                        sap.m.MessageToast.show("Error fetching PDF.");
                    }
                });


            },
            showPDF: async function (base64Content) {


                var byteCharacters = atob(base64Content);
                var byteNumbers = new Array(byteCharacters.length);
                for (var i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                var byteArray = new Uint8Array(byteNumbers);
                var blob = new Blob([byteArray], {
                    type: 'application/pdf'
                });
                var pdfUrl = URL.createObjectURL(blob);
                try {
                    const canvas = await this.loadPdfToCanvas(pdfUrl);
                    this.canvasp = canvas;
                    that.aCanvas.push(canvas);

                } catch (err) {
                    MessageBox.error("Error rendering or printing PDF: " + err.message);
                }

                var oPrintBox = sap.ui.core.Fragment.byId("SignaturePad", "printBox");
                oPrintBox.setVisible(true);

                var oSignBox = sap.ui.core.Fragment.byId("SignaturePad", "signBox");
                oSignBox.setVisible(false);

                var ipBox = sap.ui.core.Fragment.byId("SignaturePad", "ipBox");
                ipBox.setVisible(false);

            },
              onPressPrint: function (oEvent) {
                oEvent.getSource().setEnabled(false);
                this.sendToEpsonPrinter(that.aCanvas, this.printIP);
            },
               sendToEpsonPrinter: async function (canvasesArray, printerIp, count) {
                var ePosDev = new epson.ePOSDevice();
                var that = this;
                //var ip = this.getView().byId("ipaddr").getValue();
                // var wdth = this.getView().byId("wdth").getValue();
                // var ht = this.getView().byId("heht").getValue();
                //printerIp = this.printerIP;

                for (let a = 0; a < canvasesArray.length; a++) {
                    that.counter = a;
                    const canvases = canvasesArray[a];
                    await new Promise((resolve, reject) => {
                        ePosDev.connect(printerIp, 8043, function (resultConnect) {
                            if (resultConnect === "OK" || resultConnect == "SSL_CONNECT_OK") {
                                ePosDev.createDevice("local_printer", ePosDev.DEVICE_TYPE_PRINTER,
                                    { crypto: false, buffer: false },
                                    async function (deviceObj, resultCreate) {
                                        if (resultCreate === "OK") {
                                            var printer = deviceObj;



                                            printer.brightness = 1.0;
                                            printer.halftone = printer.HALFTONE_ERROR_DIFFUSION;
                                            for (const canvas of canvases) {
                                                printer.addImage(canvas.getContext("2d", { willReadFrequently: true }), 0, 0, canvas.width, canvas.height, printer.COLOR_1, printer.MODE_MONO);
                                            }


                                            printer.addCut(printer.CUT_FEED);
                                            await printer.send();
                                            resolve();
                                            if (canvasesArray.length === that.counter + 1) {
                                                window.location.reload(true);
                                            }
                                            // printer.send(function (resultSend) {
                                            //     if (resultSend === "OK") {
                                            //         sap.m.MessageToast.show("Printed successfully!");
                                            //     } else {
                                            //         sap.m.MessageBox.error("Print failed: " + resultSend);
                                            //     }
                                            // });
                                        } else {
                                            sap.m.MessageBox.error("Failed to create device: " + resultCreate);
                                            reject(resultCreate);
                                        }
                                    }
                                );
                            } else {
                                //sap.m.MessageBox.error("Connection failed: " + resultConnect);
                                sap.m.MessageBox.error("Connection failed: " + resultConnect, {
                                    title: "Error",
                                    actions: [sap.m.MessageBox.Action.OK],
                                    onClose: function (oAction) {
                                        if (oAction === sap.m.MessageBox.Action.OK) {
                                            window.location.reload(true);
                                        }
                                    }.bind(this)
                                });
                            }
                        });
                    });
                }

            },
              loadPdfToCanvas: async function (pdfUrl) {
                await this.ensurePdfJsLib();

                try {
                    const pdfDoc = await pdfjsLib.getDocument(pdfUrl).promise;
                    const printerWidth = 576;
                    const canvasArray = [];

                    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
                        const page = await pdfDoc.getPage(pageNum);
                        const scale = printerWidth / page.getViewport({ scale: 1 }).width;
                        const viewport = page.getViewport({ scale });
                        const pdfContainer = document.getElementById("pdf-viewport");
                        //const canvas = document.createElement("canvas");
                       const { canvas, context } = this.createHiDPICanvas(viewport.width,viewport.height);
                        // pdfContainer.appendChild(canvas);
                        const width = viewport.width;
                        const height = viewport.height;
                        canvas.height = height;
                        canvas.width = width;
                        canvas.style.width = Math.floor(width) + "px";
                        canvas.style.height = Math.floor(height) + "px";
                        canvas.setAttribute("willReadFrequently", "true");
                        // canvas.width = viewport.width;
                        // canvas.height = viewport.height;
                       // const context = canvas.getContext("2d", { willReadFrequently: true });
                        context.clearRect(0, 0, width, height);

                        await page.render({
                            canvasContext: context,
                            viewport
                        }).promise;

                        let top = 0;
                        let bottom = height;
                        let left = 0;
                        let right = width;

                        while (top < bottom) {
                            const imageData = context.getImageData(
                                left,
                                top,
                                right - left,
                                1
                            ).data;
                            if (!this.isSingleColor(imageData)) {
                                break;
                            }
                            top++;
                        }
                        while (top < bottom) {
                            const imageData = context.getImageData(
                                left,
                                bottom,
                                right - left,
                                1
                            ).data;
                            if (!this.isSingleColor(imageData)) {
                                break;
                            }
                            bottom--;
                        }
                        while (left < right) {
                            const imageData = context.getImageData(
                                left,
                                top,
                                1,
                                bottom - top
                            ).data;
                            if (!this.isSingleColor(imageData)) {
                                break;
                            }
                            left++;
                        }
                        while (left < right) {
                            const imageData = context.getImageData(
                                right,
                                top,
                                1,
                                bottom - top
                            ).data;
                            if (!this.isSingleColor(imageData)) {
                                break;
                            }
                            right--;
                        }

                        context.clearRect(0, 0, width, height);
                        const adjustedScale = printerWidth / (right - left);
                        const adjustedWidth = (right - left) * adjustedScale;
                        const adjustedHeight = (bottom - top) * adjustedScale;

                        canvas.height = adjustedHeight + 10;
                        canvas.width = adjustedWidth;
                        canvas.style.width = `${adjustedWidth}px`;
                        canvas.style.height = `${adjustedHeight}px`;

                        pdfContainer.appendChild(canvas);
                        await page.render({
                            canvasContext: context,
                            viewport,
                        }).promise;

                        // Store each rendered canvas
                        canvasArray.push(canvas);
                    }

                    // Now return array of canvases or send to printer
                    return canvasArray;

                } catch (error) {
                    console.error("Error loading PDF:", error);
                    MessageToast.show("Failed to load PDF: " + error.message);
                }
            },
            isSingleColor: function (imageData) {
                const stride = 4;
                for (let offset = 0; offset < stride; offset++) {
                    const first = imageData[offset];
                    for (let i = offset; i < imageData.length; i += stride) {
                        if (first !== imageData[i]) {
                            return false;
                        }
                    }
                }
                return true;
            },
            getPixelRatio: function () {
                var ctx = document.createElement("canvas").getContext("2d"),
                    dpr = window.devicePixelRatio || 1,
                    bsr =
                        ctx.webkitBackingStorePixelRatio ||
                        ctx.mozBackingStorePixelRatio ||
                        ctx.msBackingStorePixelRatio ||
                        ctx.oBackingStorePixelRatio ||
                        ctx.backingStorePixelRatio ||
                        1;

                return dpr / bsr;
            },

            createHiDPICanvas: function (w, h, ratio) {
                if (!ratio) {
                    ratio = this.getPixelRatio();
                }
                const canvas = document.createElement("canvas");
                canvas.width = w * ratio;
                canvas.height = h * ratio;
                canvas.style.width = w + "px";
                canvas.style.height = h + "px";
                const context = canvas.getContext("2d", {
                    willReadFrequently: true,
                });
                context.setTransform(ratio, 0, 0, ratio, 0, 0);
                context.imageSmoothingEnabled = true;
                context.imageSmoothingQuality = "high";
                context.font = "64px NotoSansArabic";
                return { canvas, context };
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
                            "PaymentType": "CARD",
                            "VoucherNumber": "",
                            "SourceId": that.getView().byId("tranNumber").getCount().toString() + that.paymentEntSourceCounter.toString()


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
                            // sap.ui.getCore().byId("sbmtTrans").setVisible(true);
                            that.onPressPaymentTest();
                        }
                        else {
                            sap.ui.getCore().byId("totalSaleBalText").setText(parseFloat(Math.abs(balanceAmount)).toFixed(2));
                            sap.ui.getCore().byId("cash").setValue("");
                            // sap.ui.getCore().byId("sbmtTrans").setVisible(false);
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
            onSelectCardType: function (oEvent) {
                var oSelectedItem = oEvent.getParameter("listItem").getBindingContext().getObject();
                this.selectedCardData = oSelectedItem;
                this.selectedCardType = oSelectedItem.CardType;
                this.selectedCardPayMethodName = oSelectedItem.PaymentMethodName;
                this.selectedCardPayMethod = oSelectedItem.PaymentMethod;

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
                    }).addStyleClass("sapUiSmallMarginBegin  sapUiSmallMarginTop sapUiSmallMarginBottom customInputHeight inputStyle");

                    this._oSelectCardLabel = new sap.m.Input({
                        placeholder: "Enter Card Label",
                        width: "60%"
                    }).addStyleClass("sapUiSmallMarginBegin  sapUiTinyMarginTop sapUiSmallMarginBottom customInputHeight inputStyle");

                    this._oSelectCardApproval = new sap.m.Input({
                        placeholder: "Enter Approval Code",
                        width: "60%"
                    }).addStyleClass("sapUiSmallMarginBegin  sapUiTinyMarginTop sapUiSmallMarginBottom customInputHeight inputStyle");

                    this._oSelectCardReciept = new sap.m.Input({
                        placeholder: "Enter Card Reciept Number",
                        width: "60%"
                    }).addStyleClass("sapUiSmallMarginBegin  sapUiTinyMarginTop sapUiSmallMarginBottom customInputHeight inputStyle");

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
            onPressCancel: function(){
                var that = this;
                var oPayload = this.oPayload;
                this.oPayload.Remarks = this.getView().byId("comments").getValue();
         
                    this.oModel.create("/SalesTransactionHeaderSet", oPayload, {
                    success: function (oData) {
                        that.getView().setBusy(false);
                       if (that._pAddRecordDialog) {
                            that._pAddRecordDialog.setBusy(false);
                        }
                        that.getView().byId("tranNumber").setCount(oData.TransactionId);
                        MessageBox.success("Advance Payment Cancelled Successfully.", {
                            onClose: function (sAction) {
                                  that.onOpenPrinterDialog();
                                //window.location.reload(true);
                            }
                        });
                    },
                    error: function (oError) {
                        that.getView().setBusy(false);
                        that._oDialogPayment.setBusy(false);
                        sap.m.MessageToast.show("Error");
                    }
                });
            },
            onSearch: function(){
                var recieptNumber = this.getView().byId("inpAdvanceReciept").getValue();
                 var aFilters = [];

                aFilters.push(new sap.ui.model.Filter("TransactionId", sap.ui.model.FilterOperator.EQ, recieptNumber));
                aFilters.push(new sap.ui.model.Filter("TransactionType", sap.ui.model.FilterOperator.EQ, "3"));
                 this.oModel.read("/SalesTransactionHeaderSet", {
                    filters :aFilters,
                    urlParameters: {
                        "$expand": "ToItems,ToDiscounts,ToPayments,ToSerials"
                    },

                    success: function (oData) {
                        if(oData){
                            that.oPayload = oData.results[0];
                            that.getView().byId("advPaymenttab").setVisible(true);
                            that.getView().byId("saleAmountIcon").setCount(oData.results[0].SaleAmount);
                            that.getView().byId("tabAmount").setText(oData.results[0].SaleAmount);
                            that.getView().byId("tabCustomer").setText(oData.results[0].CustomerName);
                            that.getView().byId("customer").setCount(oData.results[0].CustomerName);
                            that.getView().byId("tabRemarks").setText(oData.results[0].Remarks);
                            that.getView(). byId("Cancel").setPressEnabled(true);


                        }
                    },
                    error: function (oError) {
                        that.getView(). byId("Cancel").setPressEnabled(false);
                        that.getView().byId("tabAmount").setText("");
                        that.getView().byId("tabCustomer").setText("");
                        that.getView().byId("customer").setCount("");
                        that.getView().byId("tabRemarks").setText("");
                        sap.m.MessageBox.show(
                            JSON.parse(oError.responseText).error.message.value, {
                            icon: sap.m.MessageBox.Icon.Error,
                            title: "Error",
                            actions: ["OK", "CANCEL"],
                            onClose: function (oAction) {

                            }
                        }
                        );


                    }
                });
            },
            onPressCan: function(){
                this.onOpenSignaturePad();
            },
                OnSignaturePress: function () {
                var that = this,
                    oView = this.getView();
                if (!this._pAddRecordDialog) {
                    this._pAddRecordDialog = Fragment.load({
                        id: oView.getId(),
                        name: "com.eros.advancepayment.fragment.signaturePad",
                        controller: this,
                    }).then(function (oValueHelpDialog) {
                        oView.addDependent(oValueHelpDialog);
                        return oValueHelpDialog;
                    });
                }

                this._pAddRecordDialog.then(
                    function (oValueHelpDialog) {
                        that.onClear();
                        oValueHelpDialog.open();
                    }.bind(that)
                );
            },
            onSave: function () {
                var that = this,
                    token,
                    dataUrl,
                    oSvg = sap.ui.core.Fragment.byId(this.getView().getId(), "idSignaturePad").getSVGString(),
                    oSvgCash = sap.ui.core.Fragment.byId(this.getView().getId(), "idSignaturePadCash").getSVGString();
                this.oPaySignatureload = [];
                // oName = sap.ui.core.Fragment.byId(this.getView().getId(), "idName").getValue(),
                // oStaff = sap.ui.core.Fragment.byId(this.getView().getId(), "idStaff").getValue(),
                // oComments = sap.ui.core.Fragment.byId(this.getView().getId(), "idComments").getValue();

                if (!oSvg.includes('d=') || !oSvgCash.includes('d=')) {
                    MessageBox.error('Signature is required');
                    return false;
                }
                const svgBlob = new Blob([oSvg], {
                    type: 'image/svg+xml'
                });
                const svgObjectUrl = globalThis.URL.createObjectURL(svgBlob);
                const img = document.createElement('img');

                const onImageLoaded = () => {
                    const canvas = document.createElement('canvas');
                    //canvas.width="350";
                    //canvas.height="100";
                    const context = canvas.getContext('2d');
                    const createdImage = document.createElement('img');

                    context.drawImage(img, 0, 0);
                    createdImage.src = canvas.toDataURL('image/bmp');
                    //binary code
                    var oArray = (createdImage.src).split(";base64,")[1];
                    var raw = window.atob(oArray);
                    var rawLength = raw.length;
                    var array = new Uint8Array(new ArrayBuffer(rawLength));
                    for (var i = 0; i < rawLength; i++) {
                        array[i] = raw.charCodeAt(i);
                    }

                    this.oPaySignatureload.push({
                        "TransactionId": this.getView().byId("tranNumber").getCount(),
                        "Value": oArray,
                        "Mimetype": 'image/bmp',
                        "SignType": "S"
                    })


                };

                img.addEventListener('load', onImageLoaded);
                img.src = svgObjectUrl;



                const svgBlobCash = new Blob([oSvgCash], {
                    type: 'image/svg+xml'
                });
                const svgObjectUrlCash = globalThis.URL.createObjectURL(svgBlobCash);
                const imgCash = document.createElement('img');

                const onImageLoadedCash = () => {
                    const canvasCash = document.createElement('canvas');
                    //canvas.width="350";
                    //canvas.height="100";
                    const contextCash = canvasCash.getContext('2d');
                    const createdImageCash = document.createElement('img');

                    contextCash.drawImage(imgCash, 0, 0);
                    createdImageCash.src = canvasCash.toDataURL('image/bmp');
                    //binary code
                    var oArrayCash = (createdImageCash.src).split(";base64,")[1];
                    var rawCash = window.atob(oArrayCash);
                    var rawLengthCash = rawCash.length;
                    var arrayCash = new Uint8Array(new ArrayBuffer(rawLengthCash));
                    for (var j = 0; j < rawLengthCash; j++) {
                        arrayCash[j] = rawCash.charCodeAt(j);
                    }

                    this.oPaySignatureload.push({
                        "TransactionId": this.getView().byId("tranNumber").getCount(),
                        "Value": oArrayCash,
                        "Mimetype": 'image/bmp',
                        "SignType": "C"
                    })


                };

                imgCash.addEventListener('load', onImageLoadedCash);
                imgCash.src = svgObjectUrlCash;
                that._pAddRecordDialog.then(
                    function (oValueHelpDialog) {
                        that.onClear();
                        oValueHelpDialog.setBusy(true);
                    }.bind(that)
                );
                setTimeout(function(){
                    that.onPressCancel();},1000)


            },
             onClear: function () {
               // sap.ui.core.Fragment.byId(this.getView().getId(), "idSignaturePad").clear();
                sap.ui.core.Fragment.byId(this.getView().getId(), "idSignaturePadCash").clear();
                // sap.ui.core.Fragment.byId(this.getView().getId(), "idName").setValue("");
                // sap.ui.core.Fragment.byId(this.getView().getId(), "idStaff").setValue("");
                // sap.ui.core.Fragment.byId(this.getView().getId(), "idComments").setValue("");
            },
              onClearCashierSignature: function(){
                sap.ui.core.Fragment.byId(this.getView().getId(), "idSignaturePad").clear();
            },
               onDialogClose: function () {
                this.onClear();
                this._pAddRecordDialog.then(
                    function (oValueHelpDialog) {
                        oValueHelpDialog.close();
                    }.bind(this)
                );
            },
                  _initializeCanvas: function () {
                this._initializeCanvas1();
                this._initializeCanvas2();
            },
            _initializeCanvas1: function () {
                const oCanvasControl = sap.ui.core.Fragment.byId("SignaturePad", "signatureCanvas");
                if (!oCanvasControl) {
                    console.error("Canvas control not found");
                    return;
                }

                const canvas = oCanvasControl.getDomRef(); // Get actual <canvas> DOM element
                if (!canvas || !canvas.getContext) {
                    console.error("Canvas DOM element not ready or invalid");
                    return;
                }

                const ctx = canvas.getContext("2d");
                let isDrawing = false;

                const getEventPosition = (e) => {
                    let x, y;
                    if (e.touches && e.touches.length > 0) {
                        x = e.touches[0].clientX - canvas.getBoundingClientRect().left;
                        y = e.touches[0].clientY - canvas.getBoundingClientRect().top;
                    } else {
                        x = e.clientX - canvas.getBoundingClientRect().left;
                        y = e.clientY - canvas.getBoundingClientRect().top;
                    }
                    return {
                        x,
                        y
                    };
                };

                const start = (e) => {
                    isDrawing = true;
                    ctx.beginPath();
                    const pos = getEventPosition(e);
                    ctx.moveTo(pos.x, pos.y);
                    e.preventDefault();
                };

                const draw = (e) => {
                    if (!isDrawing) return;
                    const pos = getEventPosition(e);
                    ctx.lineTo(pos.x, pos.y);
                    ctx.stroke();
                    e.preventDefault();
                };

                const end = () => {
                    isDrawing = false;
                };

                canvas.addEventListener("mousedown", start);
                canvas.addEventListener("mousemove", draw);
                canvas.addEventListener("mouseup", end);
                canvas.addEventListener("mouseout", end);

                canvas.addEventListener("touchstart", start, {
                    passive: false
                });
                canvas.addEventListener("touchmove", draw, {
                    passive: false
                });
                canvas.addEventListener("touchend", end);
            },
            _initializeCanvas2: function () {
                const oCanvasControl = sap.ui.core.Fragment.byId("SignaturePad", "signatureCanvas1");
                if (!oCanvasControl) {
                    console.error("Canvas control not found");
                    return;
                }

                const canvas = oCanvasControl.getDomRef(); // Get actual <canvas> DOM element
                if (!canvas || !canvas.getContext) {
                    console.error("Canvas DOM element not ready or invalid");
                    return;
                }

                const ctx = canvas.getContext("2d");
                let isDrawing = false;

                const getEventPosition = (e) => {
                    let x, y;
                    if (e.touches && e.touches.length > 0) {
                        x = e.touches[0].clientX - canvas.getBoundingClientRect().left;
                        y = e.touches[0].clientY - canvas.getBoundingClientRect().top;
                    } else {
                        x = e.clientX - canvas.getBoundingClientRect().left;
                        y = e.clientY - canvas.getBoundingClientRect().top;
                    }
                    return {
                        x,
                        y
                    };
                };

                const start = (e) => {
                    isDrawing = true;
                    ctx.beginPath();
                    const pos = getEventPosition(e);
                    ctx.moveTo(pos.x, pos.y);
                    e.preventDefault();
                };

                const draw = (e) => {
                    if (!isDrawing) return;
                    const pos = getEventPosition(e);
                    ctx.lineTo(pos.x, pos.y);
                    ctx.stroke();
                    e.preventDefault();
                };

                const end = () => {
                    isDrawing = false;
                };

                canvas.addEventListener("mousedown", start);
                canvas.addEventListener("mousemove", draw);
                canvas.addEventListener("mouseup", end);
                canvas.addEventListener("mouseout", end);

                canvas.addEventListener("touchstart", start, {
                    passive: false
                });
                canvas.addEventListener("touchmove", draw, {
                    passive: false
                });
                canvas.addEventListener("touchend", end);
            },
            onClearSignature: function () {


                const oCanvasControl1 = sap.ui.core.Fragment.byId("SignaturePad", "signatureCanvas1");
                const canvas1 = oCanvasControl1.getDomRef();
                const ctx1 = canvas1.getContext("2d");
                ctx1.clearRect(0, 0, canvas1.width, canvas1.height);
            },
            onClearCashierSignature: function () {
                const oCanvasControl = sap.ui.core.Fragment.byId("SignaturePad", "signatureCanvas");
                const canvas = oCanvasControl.getDomRef();
                const ctx = canvas.getContext("2d");
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            },
            onSaveSignature: function (oEvent) {
                var that = this;
                oEvent.getSource().setEnabled(false);
                that._pAddRecordDialog.setBusy(true);
                this.oPaySignatureload = [];
                const oCanvasControl = sap.ui.core.Fragment.byId("SignaturePad", "signatureCanvas");
                const canvas = oCanvasControl.getDomRef();
                const imageData = canvas.toDataURL("image/png"); // base64 format
                // You can now send this to backend or store it
                console.log("Signature Base64:", imageData);

                const oCanvasControl1 = sap.ui.core.Fragment.byId("SignaturePad", "signatureCanvas1");
                const canvas1 = oCanvasControl1.getDomRef();
                const imageData1 = canvas1.toDataURL("image/png"); // base64 format
                // You can now send this to backend or store it
                console.log("Signature Base64:", imageData1);

                this.oPaySignatureload.push({
                    "TransactionId": this.getView().byId("tranNumber").getCount(),
                    "Value": imageData.split("data:image/png;base64,")[1],
                    "Mimetype": 'image/png',
                    "SignType": "S"
                })

                this.oPaySignatureload.push({
                    "TransactionId": this.getView().byId("tranNumber").getCount(),
                    "Value": imageData1.split("data:image/png;base64,")[1],
                    "Mimetype": 'image/png',
                    "SignType": "C"
                })


                that._pAddRecordDialog.setBusy(true);
                setTimeout(function () {
                    that.onPressCancel(true);
                }, 1000)
            },
            onOpenSignaturePad: function () {
                if (!this._pAddRecordDialog) {
                    const oContent = sap.ui.xmlfragment(
                        "SignaturePad",
                        "com.eros.advancepayment.fragment.SignaturePads",
                        this
                    );

                    this._pAddRecordDialog = new sap.m.Dialog({
                        title: "Signature Pad",
                        content: [oContent],
                        stretch: true,
                        afterOpen: this._initializeCanvas.bind(this),
                        customHeader: new sap.m.Toolbar({
                            content: [
                                new sap.m.Title({ text: "Signature Pad" }),
                                new sap.m.ToolbarSpacer(),
                                new sap.m.Button({
                                    icon: "sap-icon://decline",
                                    tooltip: "Close",
                                    press: function () {
                                        if(this.aCanvas && this.aCanvas.length > 0){
                                        window.location.reload(true);
                                        }
                                        else if(sap.ui.core.Fragment.byId("SignaturePad", "ipBox").getVisible()) {
                                        window.location.reload(true);
                                        }
                                        else{
                                          this._pAddRecordDialog.close();
                                        }
                                    }.bind(this)
                                })
                            ]
                        })

                    });

                    this.getView().addDependent(this._pAddRecordDialog);
                }
                var oPrintBox = sap.ui.core.Fragment.byId("SignaturePad", "printBox");
                oPrintBox.setVisible(false);
                this._pAddRecordDialog.open();
            },
            ensurePdfJsLib: async function () {
                if (!window.pdfjsLib) {
                    await new Promise((resolve, reject) => {
                        const script = document.createElement("script");
                        script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js";
                        script.onload = () => {
                            window.pdfjsLib = window['pdfjs-dist/build/pdf'];
                            window.pdfjsLib.GlobalWorkerOptions.workerSrc =
                                "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";
                            resolve();
                        };
                        script.onerror = reject;
                        document.head.appendChild(script);
                    });
                }
            },

            
        });
    });
