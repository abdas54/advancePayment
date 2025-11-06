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
    function (Controller, JSONModel, MessageToast, Fragment, MessageBox, epson2) {
        "use strict";
        var that;
        return Controller.extend("com.eros.advancepayment.controller.Main", {
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
                this.cashierID = "";
                this.CashierPwd = "";
            },
            enableValidateBtn: function (oEvent) {
                if (oEvent.getSource().getId() === "cashId") {
                    this.cashierID = oEvent.getSource().getValue();
                }
                else if (oEvent.getSource().getId() === "casPwd") {
                    this.CashierPwd = oEvent.getSource().getValue();
                }


                if (this.cashierID.length > 0 && this.CashierPwd.length > 0) {
                    sap.ui.getCore().byId("validatebtn").setEnabled(true);
                }
                else {
                    sap.ui.getCore().byId("validatebtn").setEnabled(false);
                }
            },
            validateLoggedInUser: function () {
                var that = this;
                this.oModel.read("/StoreIDSet", {
                    success: function (oData) {
                        that.storeID = oData.results[0] ? oData.results[0].Store : "";
                        that.plantID = oData.results[0] ? oData.results[0].Plant : "";
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
                        option: "Basic Information",
                        icon: "sap-icon://add-contact"
                    }, {
                        option: "Customer Address",
                        icon: "sap-icon://database"
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
                var sSelectedOption = oEvent.getSource().getProperty("header"); //oEvent.getSource().getTitle();
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
                            option: "Cash",
                            icon: "sap-icon://wallet"
                        }, {
                            option: "Card",
                            icon: "sap-icon://credit-card"
                        }, {
                            option: "Non-GV",
                            icon: "sap-icon://money-bills"
                        },
                        {
                            option: "EGV",
                            icon: "sap-icon://money-bills"
                        }, {
                            option: "View All Records",
                            icon: "sap-icon://sum"
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
                            this.getView().getModel("ShowPaymentSection").setProperty("/selectedMode", "");
                            sap.ui.getCore().byId("totalAmountText").setText(parseFloat(that.getView().byId("saleAmount").getValue()).toFixed(2));
                            sap.ui.getCore().byId("totalSaleBalText").setText(parseFloat(that.getView().byId("saleAmount").getValue()).toFixed(2));
                            this.getView().addDependent(this._oDialogPayment);
                            sap.ui.getCore().byId("cashSbmtBtn").setEnabled(true);
                            this._oDialogPayment.open();
                            this._oDialogCashier.close();
                        }.bind(this));
                    } else {
                        this.getView().getModel("ShowPaymentSection").setProperty("/selectedMode", "");
                        sap.ui.getCore().byId("cashSbmtBtn").setEnabled(true);
                        this._oDialogPayment.open();
                        sap.ui.getCore().byId("totalAmountText").setText(parseFloat(that.getView().byId("saleAmount").getValue()).toFixed(2));
                        this._oDialogCashier.close();
                    }
                }
                else {
                    MessageBox.error("Kindly enter Customer Details");
                }
            },
            onOptionSelectPayment: function (oEvent) {
                var sSelectedOption = oEvent.getSource().getProperty("header"); //oEvent.getSource().getTitle();
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
                if (sSelectedOption === "View All Records") {
                    this.getView().getModel("ShowPaymentSection").setProperty("/allEntries", this.aPaymentEntries)
                }
            },
            onPressClose: function () {
                this._oDialogPayment.close();
            },
            onCashSubmit: function (oEvent) {
                var that= this;
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
                        sap.ui.getCore().byId("sbmtTrans").setVisible(true);
                        event.setEnabled(false);
                        sap.m.MessageToast.show("Cash Payment Successful");
                        if (balanceAmount !== "0.00") {
                            sap.m.MessageBox.show("Tender Balance Amount is " + balanceAmount, {
                                icon: sap.m.MessageBox.Icon.INFORMATION,
                                title: "Tender Balance",
                                actions: [MessageBox.Action.OK],
                                onClose: function (oAction) {
                                    that.onOpenSignaturePad();
                                }
                            });
                        }
                        else {

                            that.onOpenSignaturePad();
                        }
                        //that.onPressPaymentTest();
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
                    "SaleAmount": this.getView().byId("saleAmount").getValue().toString(),
                    "Currency": "AED",
                    "OriginalTransactionId": "", // Required for Return Sales
                    "CustomerName": this.getView().byId("customer").getCount().toString(),
                    "ContactNo": contactNumber,
                    "CountryCode": this.getView().getModel("custAddModel").getData().Code,
                    "Mobile": this.getView().getModel("custAddModel").getData().Mobile,
                    "EMail": this.getView().getModel("custAddModel").getData().Email,
                    "TrnNumber": this.getView().getModel("custAddModel").getData().TrnNumber,
                    "Address": this.shippingAddress,
                    "ShippingInstruction": "",
                    "DeliveryDate": new Date(),
                    "ToItems": { "results": [] },
                    "ToDiscounts": { "results": [] },
                    "ToPayments": { "results": this.oPayloadPayments(this.aPaymentEntries) },
                    "ToSerials": { "results": [] },
                    "Remarks": this.getView().byId("comments").getValue(),
                    "CustomerType": this.getView().getModel("custAddModel").getData().CustomerType,
                    "ToSignature": { "results": this.oPaySignatureload }
                    // "ToPayments" : {"results" : this.oPayloadTablePayments()}
                }
                this.getView().setBusy(true);
                this._oDialogPayment.setBusy(true);
                this.oModel.create("/SalesTransactionHeaderSet", oPayload, {
                    success: function (oData) {
                        that.getView().setBusy(false);
                        that._oDialogPayment.setBusy(false);
                        if (that._pAddRecordDialog) {
                            that._pAddRecordDialog.setBusy(false);
                        }
                        that.getView().byId("tranNumber").setCount(oData.TransactionId);
                        that.getView().setBusy(false);
                        if (that._oDialogPayment) {
                            that._oDialogPayment.setBusy(false);
                        }
                   
                        MessageBox.success("Advance Payment Posted Successfully.", {
                            onClose: function (sAction) {
                                 for (var count = 1; count <= 2; count++) {
                                                that.getPDFBase64(count);
                                            }
                            }
                        });
                    },
                    error: function (oError) {
                        that.getView().setBusy(false);
                        that._oDialogPayment.setBusy(false);
                        that.getView().setBusy(false);
                        sap.m.MessageBox.show(JSON.parse(oError.responseText).error.message.value, {
                            icon: sap.m.MessageBox.Icon.Error,
                            title: "Error",
                            actions: [MessageBox.Action.OK],
                            onClose: function (oAction) {
                                if (oAction === MessageBox.Action.OK) {
                                    if (that._pAddRecordDialog) {
                                        that._pAddRecordDialog.setBusy(false);
                                    }
                                }
                            }
                        });
                    }
                });

            },
                          getPDFBase64: function (count) {
                var that = this;
                var tranNumber = this.getView().byId("tranNumber").getCount().toString();
                var sUrl = "/sap/opu/odata/SAP/ZEROS_RETAIL_PROJECT_SRV/TransactionPDFSet(TransactionId='" + tranNumber + "',TransactionCopy='" + count + "')/$value";

                // Create XMLHttpRequest
                var xhr = new XMLHttpRequest();
                xhr.open("GET", sUrl, true);
                xhr.responseType = "arraybuffer"; // Important to get binary content

                xhr.onload = function () {
                    if (xhr.status === 200) {
                        var oHtmlControl = sap.ui.core.Fragment.byId("SignaturePad", "pdfCanvas");
                        var iframeContent = '<div id="pdf-viewport"></div>';
                        oHtmlControl.setContent(iframeContent);
                        oHtmlControl.setVisible(true);

                        var oPrintBox = sap.ui.core.Fragment.byId("SignaturePad", "printBox");
                        oPrintBox.setVisible(true);

                        var oSignBox = sap.ui.core.Fragment.byId("SignaturePad", "signBox");
                        oSignBox.setVisible(false);
                        // Convert binary to Base64
                        var binary = '';
                        var bytes = new Uint8Array(xhr.response);
                        var len = bytes.byteLength;
                        for (var i = 0; i < len; i++) {
                            binary += String.fromCharCode(bytes[i]);
                        }

                        var base64 = btoa(binary);
                        console.log("Base64 PDF Content:", base64);

                        that.onShowPDFSEPP(base64, count);

                    } else {
                        console.error("Failed to fetch PDF. Status: ", xhr.status);
                    }
                };

                xhr.send();
            },


            onShowPDFSEPP: async function (base64Content, count) {

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

                var printerIp = "192.168.10.75"; // your Epson printer IP

                try {
                    const canvas = await this.loadPdfToCanvas(pdfUrl);
                    this.canvasp = canvas;
                    this.printerIP = printerIp;

                    this.sendToEpsonPrinter(canvas, printerIp, count);
                } catch (err) {
                    MessageBox.error("Error rendering or printing PDF: " + err.message);
                }

            },
            onPressPrint: function () {
                this.sendToEpsonPrinter(this.canvasp, this.printerIP);
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
                        const canvas = document.createElement("canvas");
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
                        const context = canvas.getContext("2d", { willReadFrequently: true });
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

            sendToEpsonPrinter: function (canvases, printerIp, count) {
                var ePosDev = new epson.ePOSDevice();
                //var ip = this.getView().byId("ipaddr").getValue();
                // var wdth = this.getView().byId("wdth").getValue();
                // var ht = this.getView().byId("heht").getValue();

                ePosDev.connect(printerIp, 8043, function (resultConnect) {
                    if (resultConnect === "OK" || resultConnect == "SSL_CONNECT_OK") {
                        ePosDev.createDevice("local_printer", ePosDev.DEVICE_TYPE_PRINTER,
                            { crypto: false, buffer: false },
                            function (deviceObj, resultCreate) {
                                if (resultCreate === "OK") {
                                    var printer = deviceObj;



                                    printer.brightness = 1.0;
                                    printer.halftone = printer.HALFTONE_ERROR_DIFFUSION;
                                    for (const canvas of canvases) {
                                        printer.addImage(canvas.getContext("2d", { willReadFrequently: true }), 0, 0, canvas.width, canvas.height, printer.COLOR_1, printer.MODE_MONO);
                                    }


                                    printer.addCut(printer.CUT_FEED);
                                    printer.send();
                                    if (count == 2) {
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
            },
            onClear: function () {
                //sap.ui.core.Fragment.byId(this.getView().getId(), "idSignaturePad").clear();
                sap.ui.core.Fragment.byId(this.getView().getId(), "idSignaturePadCash").clear();

            },
            onClearCashierSignature: function () {
                sap.ui.core.Fragment.byId(this.getView().getId(), "idSignaturePad").clear();
            },
            onRetrieveTerminal: function (oEvent) {
                this.cashAmount = oEvent.getParameter("value");
                var that = this;
                var aFilters = [];
                if (parseFloat(this.cashAmount) <= parseFloat(sap.ui.getCore().byId("totalSaleBalText").getText())) {
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
                }
                else {
                    sap.m.MessageBox.error("Entered Amount is more than Sale Amount");
                }
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
                            sap.ui.getCore().byId("sbmtTrans").setVisible(true);
                            //that.onPressPaymentTest();
                            that.onOpenSignaturePad();
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
                        width: "60%",
                        change: this.validateEnterAmount.bind(this)
                    }).addStyleClass("sapUiSmallMarginBegin  sapUiSmallMarginTop sapUiSmallMarginBottom customInputHeight inputStyle");

                    this._oSelectCardLabel = new sap.m.Input({
                        placeholder: "Enter Card Label",
                        width: "60%"
                    }).addStyleClass("sapUiSmallMarginBegin  sapUiTinyMarginTop sapUiSmallMarginBottom customInputHeight inputStyle");
                   
                     this._oSelectCardNumber = new sap.m.Input({
                        placeholder: "Enter Card Number",
                        width: "60%"
                    }).addStyleClass("sapUiSmallMarginBegin  sapUiTinyMarginTop sapUiSmallMarginBottom inputStyle");

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
                    this._oDialogCardType.addContent(this._oSelectCardNumber);
                    this.getView().addDependent(this._oDialogCardType);
                }

                // Clear previous input
                this._oAmountCardInput.setValue("");
                this._oSelectCardLabel.setValue("");
                this._oSelectCardApproval.setValue("");
                this._oSelectCardReciept.setValue("");
                this._oSelectCardNumber.setValue("");

                this._oDialogCardType.open();
                // sap.ui.getCore().byId("manCardAmount").setValue("");
                // sap.ui.getCore().byId("manCardNumber").setValue("");
                // sap.ui.getCore().byId("manCardApproveCode").setValue("");
                // sap.ui.getCore().byId("manCardReciept").setValue("");
            },
            validateEnterAmount: function (oEvent) {
                if (parseFloat(oEvent.getSource().getValue()) > parseFloat(sap.ui.getCore().byId("totalSaleBalText").getText())) {
                    sap.m.MessageToast.show("Entered Value is more than Sale Balance");
                    oEvent.getSource().setValue("");
                }

            },
            onSubmitCardType: function () {
                var that = this;
                var sAmount = that._oAmountCardInput.getValue();
                var sCardLabel = that._oSelectCardLabel.getValue();
                var sCardApproval = that._oSelectCardApproval.getValue();
                var sCardReciept = that._oSelectCardReciept.getValue();
                var sCardNumber = that._oSelectCardNumber.getValue();
                that.paymentEntSourceCounter = that.paymentEntSourceCounter + 1;
                that.paymentId = that.paymentId + 1;

                if (!sAmount) {
                    sap.m.MessageToast.show("Please enter an amount");
                    return;
                }
                if (!sCardLabel) {
                    sap.m.MessageToast.show("Please enter Card Label");
                    return;
                }
                if (!sCardApproval) {
                    sap.m.MessageToast.show("Please enter Card Approval Code");
                    return;
                }
                if (!sCardReciept) {
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
                    "CardLabel": sCardLabel,
                    "CardNumber": sCardNumber,
                    "AuthorizationCode": sCardApproval,
                    "CardReceiptNo": sCardReciept,
                    "PaymentType": "CARD",
                    "VoucherNumber": "",
                    "SourceId": "" //that.getView().byId("tranNumber").getCount().toString() + that.paymentEntSourceCounter.toString()


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
                    that.onOpenSignaturePad();
                    //that.onPressPaymentTest();
                }
                else {
                    sap.ui.getCore().byId("totalSaleBalText").setText(parseFloat(Math.abs(balanceAmount)).toFixed(2));
                    sap.ui.getCore().byId("cash").setValue("");
                    sap.ui.getCore().byId("sbmtTrans").setVisible(false);
                    sap.m.MessageToast.show("Manual Card Payment Successful");
                }
                this._oDialogCardType.close();

            },
            onSelectNonGV: function (oEvent) {
                var oSelectedItem = oEvent.getParameter("listItem").getBindingContext().getObject();
                this._oSelectedReason = oSelectedItem; // Store the clicked item globally
                this.nonGVPaymentMethod = oSelectedItem.PaymentMethod;
                this.nonGVPaymentMethodName = oSelectedItem.PaymentMethodName;
                var bFlag = true;
                if (oSelectedItem.Validate === "X") {
                    bFlag = false;
                }
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
                        width: "60%",
                        change: this.validateEnterAmount.bind(this)
                    }).addStyleClass("sapUiSmallMarginBegin  sapUiSmallMarginTop sapUiSmallMarginBottom customInputHeight inputStyle");

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
                if (!bFlag) {
                    this._oAmountInput.setEnabled(false);
                    this._oDialogNonGV.getBeginButton().setText("Validate");

                } else {
                    this._oAmountInput.setEnabled(true);
                    this._oDialogNonGV.getBeginButton().setEnabled(true);
                    this._oDialogNonGV.getBeginButton().setText("Submit");

                }

                this._oDialogNonGV.open();
            },
         
            onSubmitAmount: function (oEvent) {
                var that = this;
                var sAmount = that._oAmountInput.getValue();
                var sVoucherNumber = that._oVoucherNumber.getValue();
                if (oEvent.getSource().getText() === "Validate") {

                    if (!sVoucherNumber) {
                        sap.m.MessageToast.show("Please enter Voucher Number");
                        return;
                    }
                    this.onValidateAdvReciept(oEvent, "N", sVoucherNumber);
                }
                else{
                that.paymentId = that.paymentId + 1;
                that.paymentEntSourceCounter = that.paymentEntSourceCounter + 1;

                if (!sAmount) {
                    sap.m.MessageToast.show("Please enter an amount");
                    return;
                }
                if (!sVoucherNumber) {
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
                    "PaymentType": "NEGV",
                    "VoucherNumber": sVoucherNumber,
                    "SourceId": "" //that.getView().byId("tranNumber").getCount().toString() + that.paymentEntSourceCounter.toString()


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
                    that.onOpenSignaturePad();
                    //that.onPressPaymentTest();
                }
                else {
                    sap.ui.getCore().byId("totalSaleBalText").setText(parseFloat(Math.abs(balanceAmount)).toFixed(2));
                    sap.ui.getCore().byId("cash").setValue("");
                    sap.ui.getCore().byId("sbmtTrans").setVisible(false);
                    sap.m.MessageToast.show("Non EGV Payment Successful");
                }
                this._oDialogNonGV.close();
            }
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
            onSubmitNonGV: function () {
                var oMultiInput = sap.ui.getCore().byId("multiInput");
                var aTokens = oMultiInput.getTokens();
                var fTotalAmount = 0;

                aTokens.forEach(function (oToken) {
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
            onEnterAmount: function (oEvent) {
                this.getView().byId("saleAmountIcon").setCount(oEvent.getParameter("value").toString())
            },
            onValidateGiftVoucher: function (oEvent) {
                this.btnEvent = oEvent.getSource();
                var giftVoucher = sap.ui.getCore().byId("giftVoucher").getValue();
                this.onValidateAdvReciept(oEvent, "E", giftVoucher);
            },
            onValidateAdvReciept: function (oEvent, mode, reciept) {
                var that = this;
                var oModel = new JSONModel();
                this.oModel.read("/RedeemTransactionSet(Transaction='" + reciept + "',RedemptionType='" + mode + "')", {
                    success: function (oData) {


                        if (mode === "E") {
                            oModel.setData({});
                            oModel.setData(oData);
                            that.getView().setModel(oModel, "GiftVoucher");
                            sap.ui.getCore().byId("gvPaymentList").setVisible(true);

                        }

                    },
                    error: function (oError) {
                        if (mode === "E") {
                            oModel.setData({});
                            that.getView().setModel(oModel, "GiftVoucher");
                            sap.ui.getCore().byId("gvPaymentList").setVisible(false);

                        }
                        sap.m.MessageBox.show(JSON.parse(oError.responseText).error.message.value, {
                            icon: sap.m.MessageBox.Icon.Error,
                            title: "Error",
                            actions: [MessageBox.Action.OK],
                            onClose: function (oAction) {

                            }
                        });
                    }
                });
            },
            onRedeemGVPayment: function (oEvent) {
                var that = this;
                that.paymentId = that.paymentId + 1;
                var paidAmount = 0;
                for (var count1 = 0; count1 < this.aPaymentEntries.length; count1++) {

                    paidAmount = parseFloat(parseFloat(this.aPaymentEntries[count1].Amount) + parseFloat(paidAmount)).toFixed(2);

                }
                var saleAmount = sap.ui.getCore().byId("totalAmountText").getText();
                var balanceAmount = parseFloat(parseFloat(saleAmount).toFixed(2) - parseFloat(paidAmount).toFixed(2)).toFixed(2);
                MessageBox.confirm("Are you sure you want to redeem the Gift Voucher ?", {
                    icon: MessageBox.Icon.Confirmation,
                    title: "Confirmation",
                    actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                    emphasizedAction: MessageBox.Action.YES,
                    onClose: function (oAction) {
                        if (oAction == "YES") {
                            that.redeemVoucher(that.paymentId, "017", "EROS Gift Voucher", "EGV", balanceAmount, "GiftVoucher");
                        }
                    }
                });



            },
            redeemVoucher: function (paymentId, paymentMethod, paymentMethodName, paymentType1, balanceAmount, model) {
                var that = this;
                var itemData = this.getView().getModel(model).getData();
                var balanceAmt = 0;
                if (itemData.RedemptionType === "E") {
                    balanceAmt = itemData.BalanceAmount;
                }
                else {
                    balanceAmt = balanceAmount;
                }
                var oPayload = {
                    "Transaction": itemData.Transaction,
                    "RedemptionType": itemData.RedemptionType,
                    "ToBeRedeemedAmount": balanceAmt,
                    "Currency": itemData.Currency,
                    "RedeemedAmount": itemData.RedeemedAmount,
                    "BalanceAmount": itemData.BalanceAmount,
                    "TransactionAmount": itemData.TransactionAmount


                }
                if (parseInt(itemData.BalanceAmount) < parseInt(balanceAmt)) {
                    oPayload.ToBeRedeemedAmount = itemData.BalanceAmount;
                }

                this.oModel.create("/RedeemTransactionSet", oPayload, {
                    success: function (oData) {
                        if (oData) {
                            that.paymentEntSourceCounter = that.paymentEntSourceCounter + 1;
                            that.aPaymentEntries.push({
                                "TransactionId": that.getView().byId("tranNumber").getCount().toString(),
                                "PaymentId": that.paymentId.toString(),
                                "PaymentDate": new Date(),
                                "Amount": oPayload.ToBeRedeemedAmount.toString(),
                                "Currency": "AED",
                                "PaymentMethod": paymentMethod,
                                "PaymentMethodName": paymentMethodName,
                                "Tid": "",
                                "Mid": "",
                                "CardType": "",
                                "CardLabel": "",
                                "CardNumber": "",
                                "AuthorizationCode": "",
                                "CardReceiptNo": "",
                                "PaymentType": paymentType1,
                                "VoucherNumber": oData.Transaction,
                                "SourceId": ""


                            });
                        }

                        if (paymentType1 === "EGV") {
                            that.updateBalanceAmount("Gift Voucher", "GiftVoucher");
                        }
                        if (paymentType1 === "CREDIT NOTE") {
                            that.updateBalanceAmount("Credit Voucher", "CreditNote");

                        }
                        if (paymentType1 === "ADVANCE PAYMENT") {
                            that.updateBalanceAmount("Advance Reciept", "AdvancePayment");
                        }
                    },
                    error: function (oError) {
                        this.paymentEntSourceCounter = this.paymentEntSourceCounter + 1;
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
            onLiveChange: function (oEvent) {
                var oInput = oEvent.getSource();
                var sRawValue = oInput.getFocusDomRef().value;
                var sSanitized = sRawValue.replace(/[^0-9.]/g, ""); // Allow only digits
                oInput.setValue(sSanitized);
            },
            updateBalanceAmount: function (msg, modelName) {
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
                    sap.m.MessageToast.show(msg + " Redeemed Successfully");
                    hat.onOpenSignaturePad();
                    //that.onPressPaymentTest();
                }
                else {
                    sap.ui.getCore().byId("totalSaleBalText").setText(parseFloat(Math.abs(balanceAmount)).toFixed(2));
                    sap.ui.getCore().byId("cash").setValue("");
                    sap.ui.getCore().byId("sbmtTrans").setVisible(false);
                    sap.m.MessageToast.show(msg + " Redeemed Successfully");
                }
                that.getView().getModel(modelName).setData({});
                if (modelName === "GiftVoucher") {
                    sap.ui.getCore().byId("giftVoucher").setValue("");
                    sap.ui.getCore().byId("gvPaymentList").setVisible(false);
                }

            },
            onDeleteManualPayment: function (oEvent) {
                var oModel = this.getView().getModel("ShowPaymentSection"); // Get the JSON model
                var aEntries = oModel.getProperty("/allEntries"); // Get the array from the model
                var oItem = oEvent.getParameter("listItem");
                var oContext = oItem.getBindingContext("ShowPaymentSection");
                var dataObj = oModel.getObject(oContext.sPath);
                var iIndex = oContext.getPath().split("/").pop();
                aEntries.splice(iIndex, 1);
                //this.aPaymentEntries.splice(iIndex,1);
                var balanceAmount = "";
                if (dataObj.PaymentType === "CASH") {
                    var totSalBal = sap.ui.getCore().byId("totalSaleBalText").getText();
                    balanceAmount = parseFloat(dataObj.Amount) + parseFloat(totSalBal)
                    sap.ui.getCore().byId("totalSaleBalText").setText(parseFloat(balanceAmount).toFixed(2));
                    this.getView().getModel("ShowPaymentSection").setProperty("/allEntries", this.aPaymentEntries)
                    this.getView().getModel("ShowPaymentSection").refresh();
                }
                else {
                    this.deRedeemVoucher(dataObj);
                }

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
                setTimeout(function () {
                    that.onPressPayment(true);
                }, 1000)


            },
            onDialogClose: function () {
                this.onClear();
                this._pAddRecordDialog.then(
                    function (oValueHelpDialog) {
                        oValueHelpDialog.close();
                    }.bind(this)
                );



            },
            deRedeemVoucher: function (dataObj) {
                var balanceAmount = "";
                var that = this;
                var data = {
                    "PaymentType": dataObj.PaymentType,
                    "Amount": dataObj.Amount,
                    "VoucherNumber": dataObj.VoucherNumber
                }
                this.oModel.create("/PaymentMethodsSet", data, {
                    success: function (oData, response) {
                        var totSalBal = sap.ui.getCore().byId("totalSaleBalText").getText();
                        balanceAmount = parseFloat(dataObj.Amount) + parseFloat(totSalBal)
                        sap.ui.getCore().byId("totalSaleBalText").setText(parseFloat(balanceAmount).toFixed(2));
                        that.getView().getModel("ShowPaymentSection").setProperty("/allEntries", that.aPaymentEntries)
                        that.getView().getModel("ShowPaymentSection").refresh();

                    },
                    error: function (oError) {


                    }
                });

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
            onSaveSignature: function () {
                var that = this;
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
                    that.onPressPayment(true);
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

                    });

                    this.getView().addDependent(this._pAddRecordDialog);
                }
                var oPrintBox = sap.ui.core.Fragment.byId("SignaturePad", "printBox");
                oPrintBox.setVisible(false);
                this._pAddRecordDialog.open();
            },
        });
    });
