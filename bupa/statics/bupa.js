angular.module('bupa.core.useful-documents', [
  'cgBusy',
  'ui.bootstrap',
  'ui.bootstrap.tooltip',
  'pasvaz.bindonce',
  'mgcrea.ngStrap.modal',
  'bupa.common.translations'
]);

angular.module('bupa.core.useful-documents').directive('bpUsefulDocuments', function () {
  'use strict';

  return {
    restrict: 'E',
    scope: {
      hideEssentialNotes: '=',
      hideBenefitMaxima: '=',
      hideAppendices: '=',
      attachmentWrappers: '='
    },
    controller: 'UsefulDocumentsCtrl',
    templateUrl: '/bupa/core/useful-documents/UsefulDocuments.html'
  };
});

angular.module('bupa.core.useful-documents').controller('UsefulDocumentsCtrl', function (APP_CONFIG, SFDC, $scope) {
  'use strict';

  this.init = function () {
    $scope.APP_CONFIG = APP_CONFIG;
  };

  this.init();
});

angular.module('bupa.core.useful-links', [
  'cgBusy',
  'ui.bootstrap',
  'ui.bootstrap.tooltip',
  'pasvaz.bindonce',
  'mgcrea.ngStrap.modal',
  'bupa.common.translations'
]);

angular.module('bupa.core.useful-links').directive('bpUsefulLinks', function () {
  'use strict';

  return {
    restrict: 'E',
    controller: 'UsefulLinksCtrl',
    templateUrl: '/bupa/core/useful-links/UsefulLinks.html'
  };
});

angular.module('bupa.core.useful-links').controller('UsefulLinksCtrl', function (APP_CONFIG, SFDC, $scope, $q) {
  'use strict';

  var self = this;

  this.init = function () {
    $scope.APP_CONFIG = APP_CONFIG;

    $scope.usefulLinksCtrlFetch = self.fetch();
  };

  this.fetch = function () {
    return $q.all([
      self.fetchUsefulLinks()
    ]);
  };

  this.fetchUsefulLinks = function () {
    return SFDC.getUsefulLinksList().then(function (theUsefulLinks) {
      $scope.usefulLinks = theUsefulLinks;
    });
  };

  this.init();
});

angular.module('bupa.core.procedures', [
  'bupa.common.translations',
  'ui.router',
  'ngLazyJs',
  'ngTable',
  'cgBusy',
  'ui.bootstrap',
  'ui.bootstrap.tooltip',
  'pasvaz.bindonce',
  'mgcrea.ngStrap.modal',
  'bupa-templates',
  'bupa.core.useful-documents',
  'bupa.core.useful-links'

]).config(function ($stateProvider, APP_CONFIG, $tooltipProvider) {
  'use strict';

  $tooltipProvider.options({animation: false});

  $stateProvider.state(APP_CONFIG.states.PROCEDURES.name, {
    url: APP_CONFIG.states.PROCEDURES.url,
    templateUrl: '/bupa/core/procedures/Procedures.html',
    controller: 'BpProceduresCtrl'
  });
});

angular.module('bupa.core.procedures').service('bpProcedures', function (ngLazy, $log, SFDC) {
  'use strict';

  this.fetchChargeCodeSiteHelpTextCMap = function () {
    return SFDC.getChargeCodeSiteHelpTextCMap();
  };

});

angular.module('bupa.core.procedures').controller('BpProceduresCtrl', function(APP_CONFIG, Lazy, $scope, SFDC, ngTableParams, $log, $location, $filter, $window, $q, $timeout, bpSharedCode, $sce, bpProcedures) {
  'use strict';
  /*jshint camelcase: false */

  var self = this;
  var SharedCode = bpSharedCode;
  this.allChargeCode = [];
  this.allChargeCodeSchedule = [];
  this.chapterFiltered = [];

  this.init = function() {
    $scope.APP_CONFIG = APP_CONFIG;
    $scope.SharedCode = bpSharedCode;

    $scope.bpProceduresCtrlFetch = self.fetch();

    $scope.allChapters = [{
      val: ' --------------   Click here to view chapter pick list:   -------------- ',
      number: '0'
    }];

    $scope.chapterNumber = '0';
    $scope.isChapterShow = false;
    $scope.isLoading = false;
    $scope.hideOnInit = true;
    $scope.showSubSection = {};
    $scope.isMac = SharedCode.isMac();
    $scope.purchasedCodeCharges = SharedCode.getPurchasedChargeCodes();

    self.servType = undefined;

    $scope.services = [
      {ServiceID: 1, ServiceName: 'Surgeon', PriceField: 'Surgeon_Price__c', CalculatedPriceField: 'Surgeon_Price'},
      {ServiceID: 2, ServiceName: 'Anaesthetist', PriceField: 'Anaesthetist_Price__c' , CalculatedPriceField: 'Anaesthetist_Price'}
    ];

    $scope.defaultService = $scope.services[0];
    $scope.Calculated = false;

    //a watcher on the filter
    $scope.$watch('filter', self.onSearchTextChanged);
  };

  this.fetch = function() {
    return $q.all([
      self.legacyCombinedFetch(),
      self.fetchProceduresAttachmentWrappers(),
      self.fetchChaptersDescriptionsLegacy(),
      self.fetchChargeCodeSiteHelpTextCs()
    ]);
  };

  this.fetchChaptersDescriptionsLegacy = function() {
    return SFDC.getChaptersDescription().then(self.initAllChaptersDescription);
  };

  this.initAllChaptersDescription = function(theChaptersDescription) {
    $scope.allChaptersDescription = {};
    for (var key in theChaptersDescription) {
      $scope.allChaptersDescription[key] = $sce.trustAsHtml(theChaptersDescription[key]);
    }

    return theChaptersDescription;
  };

  this.fetchChargeCodeSiteHelpTextCs = function() {
    return bpProcedures.fetchChargeCodeSiteHelpTextCMap().then(function(theChargeCodeSiteHelpTextCMap) {
      $scope.chargeCodeSiteHelpTextCMap = theChargeCodeSiteHelpTextCMap;
    });
  };

  this.fetchProceduresAttachmentWrappers = function() {
    return SFDC.getProcedureAttachmentWrapperList().then(function(theProcedureAttachmentWrapperList) {
      $scope.procedureAttachments = theProcedureAttachmentWrapperList;
    });
  };

  this.legacyCombinedFetch = function() {
    return $q.all({
      chargeCode: SFDC.getChargeCode(),
      chargeCodeSchedule: SFDC.getChargeCodeSchedule(),
      helpTexts: SFDC.getChargeCodeSiteHelpText(),
      allUnbundlings: SFDC.getUnbundling()
    }).then(function(resp) {
      resp = SharedCode.handleInitResponse(resp, true);

      SharedCode.initScope($scope, resp);
      self.allChargeCode = resp.chargeCode;

      self.allChargeCodeSchedule = resp.chargeCodeSchedule;

      // records from the ChargeCodeUnbundling__c Object, grouped in a Map by Master Change Code
      $scope.allUnbundling = resp.allUnbundlings;
    });
  };

  this.doSearchByText = function() {

    $scope.hideOnInit = false;
    $log.debug('Starting search with search text: "', $scope.filter, '"');

    $scope.tableParams.page(1);
    $scope.tableParams.reload();
  };

  this.onSearchTextChanged = function(newVal, oldVal) {

    //we don't run on init, when both values are undefined.
    if (!angular.isString(newVal) && !angular.isString(oldVal)) {
      return;
    }

    self.doSearchByText();
  };

  $scope.getUnbundlingCode = function(codeCharge) {
    $scope.unbundlingCode = codeCharge.Name;
    $scope.unbundlingDesc = codeCharge.Description__c;
  };

  //returns unbundlings for codeCharge, to be displayed in a modal
  $scope.showUnbundling = function(codeCharge) {
    var id = codeCharge.Id;
    var bundlings = $scope.allUnbundling[id];
    return {items: bundlings};
  };

  $scope.getServiceType = function(type) {
    self.servType = type;
    $scope.displayPrice = type === 'Surgeon';

    for (var i = 0; i < $scope.purchasedCodeCharges.length; i++) {
      $scope.purchasedCodeCharges[i].adjustedPrice = null;
      $scope.purchasedCodeCharges[i].messageText = null;
    }

    $scope.clearCalculatedList();
    $scope.Calculated = false;

    $scope.total = null;
  };

  //whenever we go on a chapter, or go from chapter to chapter
  $scope.sortChapters = SharedCode.sortChapters;

  // FG - This method runs when calculate button clicked, sends codes to Apex then populates full calculated list viewResult with data from Purchased code charges
  $scope.shoppingCartCalcFull = function(cartItems) {
    var selectedCodes = [];
    $scope.loading = true;

    console.log('cartitems' + cartItems);
    angular.forEach(cartItems, function(aCartItem) {
      selectedCodes.push(aCartItem.Id);
    });

    console.log(selectedCodes); 
    if (angular.isUndefined(self.servType)) {
      self.servType = $scope.services[0].ServiceName;
    }

    selectedCodes.push(self.servType);

    //Gets seleced codes result from ChargeCodeHomeController and saves as JSON string variable
    var selectedCodesAsJsonString = angular.toJson(selectedCodes);
    console.log('selected codes' + selectedCodes);
    console.log('selected codes as json' + selectedCodesAsJsonString);

    $log.debug('ProcedureCtrl - Calling InRule with input: ', selectedCodes, '   =>   ', selectedCodesAsJsonString);
    $window.ChargeCodeHomeController.getJSONListFull(selectedCodesAsJsonString, function(result, event) {

      $log.debug('ProcedureCtrl - InRule response => ');
      $log.debug('ProcedureCtrl - result: ', result);
      $log.debug('ProcedureCtrl - event: ', event);

      console.log('ProcedureCtrl - InRule response => ');
      console.log('ProcedureCtrl - result: ', result);
      console.log('ProcedureCtrl - event: ', event);

      $scope.loading = false;

      // This function matches up the description of the code from the basket with the result so the table is complete. 
      // $scope.calculate is used to alter the view to show viewResult if true or purchasedCodeCharges if false
      $timeout(function() {

        $scope.total = null;
        $scope.total = result.totalPrice;
     
        console.log("the basket", $scope.purchasedCodeCharges);

        $scope.viewResult = result.details;
        console.log("the result", $scope.viewResult);

        var len = $scope.purchasedCodeCharges.length;
        var resLen = $scope.viewResult.length;
        console.log('len ' + len);
        console.log('reslen' + resLen);

        //For each item in the result
        for (var i = 0; i < resLen; i++) {
          console.log('in loop 1 ' + $scope.viewResult[i].code)

          //Iterate throught the items in the basket
          for (var q = 0; q < len; q++) {
            console.log($scope.viewResult[i].code + 'in loop 2 ' + $scope.purchasedCodeCharges[q].Name)
            // If the code matches then assign description from the basket to the result
            if($scope.viewResult[i].code == $scope.purchasedCodeCharges[q].Name){
              $scope.viewResult[i].Description = $scope.purchasedCodeCharges[q].Description__c;
            }
          }
        }

        $scope.Calculated = true;
      }, 2000);

    }, { buffer: true, escape: false, timeout: 50000 });
  };

  $scope.clearSelection = function() {
    $scope.isChapterShow = false;
    $scope.chapterNumber = '0';
    $scope.hideOnInit = true;
    $scope.tableParams.reload();
    $scope.tableParams.total(0);

  };

  $scope.backToMain = function() {
    SharedCode.backToMain($scope, self.allChargeCode);
  };

  // OnClick the + button
  $scope.addItem = function(codeCharge) {
  if($scope.Calculated){$scope.clearCalculatedList();}
    
    $scope.total = null;
    $scope.cartIsOpen = true;
    codeCharge.isPurchased = true;
    SharedCode.addPurchasedChargeCode(codeCharge, $scope.allUnbundling);
    $scope.purchasedCodeCharges = SharedCode.getPurchasedChargeCodes();
  };

  // OnClick the x button - uncalculated list
  $scope.removeItem = function(codeCharge) {

    console.log('removeItem' + codeCharge.Name);
    $scope.total = null
    // clears item from calculated list
    $scope.clearCalculatedList();
    // removes code from uncalculated list
    SharedCode.removePurchasedChargeCode(codeCharge.Name, $scope.allUnbundling);
    console.log('returned from shared code');
    console.log($scope.purchasedCodeCharges);
    // if use $scope.purchasedCodeCharges is empty then call closeShoppingCart()
    console.log('cheching length');
    console.log($scope.purchasedCodeCharges.length);
    if ($scope.purchasedCodeCharges.length === undefined || $scope.purchasedCodeCharges.length <= 0){
      console.log('inside if');
      $scope.closeShoppingCart();
    }

    $scope.refreshThis(); 
  };

  $scope.removeCaluclatedItem = function(codeCharge, other, location) {
    
    console.log('calculated');
    console.log($scope.viewResult);
    console.log('basket');
    console.log($scope.purchasedCodeCharges);
    //Remove calculated item from calculated list
      console.log('removeCalculatedItem ' + codeCharge.code);
      console.log('other ' + other);
      //loop same ammount of times as the length of calc list
      for (var i = $scope.viewResult.length - 1; i >= 0; i--) {
        if ($scope.viewResult[i].code === codeCharge.code) {
          console.log("removing code matched code" + codeCharge.code + " matched name" + $scope.viewResult[i].code)
          $scope.viewResult.splice(i, 1);
          console.log('calculated list');
          console.log($scope.viewResult);
          break;
        }
      }
      //remove same item from uncalculated list
      SharedCode.removePurchasedChargeCode(codeCharge.code, $scope.allUnbundling);

      //clear out total, and revert calculated to change view
      $scope.total = null;
      $scope.Calculated = false;
      $scope.clearCalculatedList();

      $scope.refreshThis();
  };

  $scope.clearCart = function() {
    console.log('clear cart');
    $scope.clearCalculatedList();
    for (var i = $scope.purchasedCodeCharges.length - 1; i >= 0; i--) {
      $scope.purchasedCodeCharges[i].isPurchased = false;
      SharedCode.removePurchasedChargeCode($scope.purchasedCodeCharges[i].Name, $scope.allUnbundling);
    }
    $scope.total = null;
  };

  $scope.clearCalculatedList = function(){
    if($scope.viewResult){
      console.log('clearCalculatedList');
      for (var i = $scope.viewResult.length - 1; i >= 0; i--) {
        $scope.viewResult.splice(i, 1);
      }
      $scope.Calculated = false;
    }
  }


// Refreshes the scope.purchasedCodeCharges list with the list from sharedcode
// fixes a continuity error between removing an item from the list and pressing calculate
  $scope.refreshThis = function(){
     $scope.purchasedCodeCharges  = {};
      
//      $scope.refreshThis2();
 // }
 // $scope.refreshThis2 = function(){
    $timeout(function() {
     $scope.purchasedCodeCharges = SharedCode.getPurchasedChargeCodes();
    }, 100);
  }


//FG - theres a field totalprice, why is it re-calcuating, removed code to test if it's actually used
 // $scope.totalPrice = function(field) {
  //  return Lazy(SharedCode.getPurchasedChargeCodes()).sum(function(cc) {
   //   return cc[field] || 0;
   // });
  //};

  $scope.chapters = {};
  $scope.chapters.showChapter = function(number) {
    if (number > 0) {
      $log.debug('showChapter Method', number);
      $scope.filter = null;
      $scope.isLoading = true;
      $scope.hideOnInit = false;
      $timeout(function() {
        $scope.chapterNumber = number;
        $scope.currentChapter = Lazy($scope.allChapters).findWhere({number: number}).val;
        $location.search('chapter', number);

        //$window.scrollTo(0,0);
        $scope.isChapterShow = true;
        $window.scrollTo(0, 0);
        $scope.showSubSection = {};
        $scope.tableParams.page(1);

        var chargeCodeScheduleOfChapter = self.allChargeCodeSchedule[$scope.currentChapter];
        self.chapterFiltered = [];
        $log.debug('chargeCodeScheduleOfChapter length:', chargeCodeScheduleOfChapter.length);

        if (chargeCodeScheduleOfChapter.length) {
          for (var i = chargeCodeScheduleOfChapter.length - 1; i >= 0; i--) {

            //we add the subsectionname used for the grouping.
            for (var j = self.allChargeCode.length - 1; j >= 0; j--) {
              if (chargeCodeScheduleOfChapter[i].ChargeCode__c === self.allChargeCode[j].Id) {
                var temp = angular.copy(self.allChargeCode[j]);
                temp.SubSectionName__c = chargeCodeScheduleOfChapter[i].SubSectionName__c;
                if (chargeCodeScheduleOfChapter[i].SubSectionName__c === '' || chargeCodeScheduleOfChapter[i].SubSectionName__c === null) {
                  // Hardcoded fix - to be removed in the next phase
                  temp.SubSectionName__c = chargeCodeScheduleOfChapter[i].Section_Name__c.replace('Appendix E:', '');
                }

                self.chapterFiltered.push(temp);
              }
            }
          }
        }

        //$scope.tableParams.count(chapterFiltered.length);
        $scope.tableParams.reload();
        $scope.isLoading = false;
      }, 1, false);
    }

    //$log.debug("chapter ChargeCodes", $scope.chargeCode);
    else {
      $scope.clearSelection();
    }
  };

  $scope.tableParams = new ngTableParams({
    page: 1,
    count: 15,
    sorting: {
      SubSectionName__c: 'asc',
      Name: 'asc'
    }
  }, {
    groupBy: function(item) {
      return $scope.isChapterShow === true ? item.SubSectionName__c : '';
    },

    counts: [], //remove the ability to change the number of records per page
    total: 0,  //we init to 0, will be set dynamic
    getData: function($defer, params) {
      //we always hide the subsection when a change happens to the page(changement of page, filtering, ...)
      $scope.showSubSection = {};

      var currentSet;
      if ($scope.isChapterShow === true) {
        //we just take the Chapter Set
        currentSet = self.chapterFiltered;
      } else {
        //we take the whole set
        currentSet = self.allChargeCode;
      }

      //angular filter
      var filter = $scope.filter ? $scope.filter.toLowerCase() : '';
      var filteredData = $scope.filter ? $filter('filter')(
        currentSet,
        function(val) {
          return !(val.Name.toLowerCase().indexOf(filter) === -1 && val.Description__c.toLowerCase().indexOf(filter) === -1);
        })

        : currentSet;

      //angular sorting
      var orderedData = params.sorting() ? $filter('orderBy')(filteredData, params.orderBy()) : currentSet;

      //we set dynamically the number of records
      if ($scope.hideOnInit !== true) {
        params.total(orderedData.length);
      }

      orderedData = orderedData.slice(
        (params.page() - 1) * params.count(),
        params.page() * params.count()
      );

      $log.info('Ordered data shown in the table:', orderedData);

      //we resolve the deferred function by setting the current dataset for the right page.
      $defer.resolve(orderedData);
    }
  });

  $scope.closeShoppingCart = function()  {
    $log.debug('ENTERING closeShoppingCart()');

    var cntltxtInput = document.getElementById('shoppingCartDiv');

    var cl = cntltxtInput.getAttribute('class');
    if (cntltxtInput) {
      if (cl === 'visible') {
        cntltxtInput.setAttribute('class', 'hidden');
      }
    }

    $log.debug('EXITING closeShoppingCart()', cntltxtInput);
  };

  $scope.openShoppingCart = function() {
    $log.debug('ENTERING openShoppingCart()');

    var cntltxtInput = document.getElementById('shoppingCartDiv');

    var cl = cntltxtInput.getAttribute('class');
    if (cntltxtInput && cl === 'hidden') {
      cntltxtInput.setAttribute('class', 'visible');
    }

    $log.debug('EXITING openShoppingCart()', cntltxtInput);

  };

  $scope.toggleShoppingCart = function() {

    $log.debug('ENTERING toggleShoppingCart()');

    var cntltxtInput = document.getElementById('shoppingCartDiv');

    var cl = cntltxtInput.getAttribute('class');

    if (cntltxtInput) {
      if (cl === 'hidden') {
        cntltxtInput.setAttribute('class', 'visible');
      } else {
        cntltxtInput.setAttribute('class', 'hidden');
      }
    }

    $log.debug('EXITING toggleShoppingCart()', cntltxtInput);
  };

  this.init();
  /*jshint camelcase: true */
});

angular.module('bupa.core.essential-notes', [
  'bupa.common',
  'ngLazyJs',
  'cgBusy',
  'mgcrea.ngStrap.modal'
]);

angular.module('bupa.core.essential-notes').service('bpEssentialNotes', function (ngLazy, $log, SFDC) {
  'use strict';

  var self = this;

  this.fetchEssentialNotes = function () {
    return SFDC.getScheduleChapterCList().then(function (theScheduleChapterCList) {
      return ngLazy(theScheduleChapterCList).filter(self.appendicesPredicate).value();
    });
  };

  this.appendicesPredicate = function (aScheduleChapterC) {
    /*jshint camelcase: false */
    return aScheduleChapterC.Type__c === 'Essential Notes';
    /*jshint camelcase: true */
  };
});

angular.module('bupa.core.essential-notes').controller('EssentialNotesCtrl', function (SFDC, $scope, $q, $log, bpEssentialNotes) {
  'use strict';

  var self = this;

  this.init = function () {
    $scope.fetchPromise = self.fetch();
  };

  this.fetch = function () {
    return $q.all([
      self.fetchEssentialNotes()
    ]);
  };

  this.fetchEssentialNotes = function () {
    return bpEssentialNotes.fetchEssentialNotes().then(function (theEssentialNotes) {
      $scope.essentialNotes = theEssentialNotes;
    });
  };

  this.init();
});

angular.module('bupa.core.home', [
  'bupa.common',
  'ui.router',
  'bupa-templates'

]).config(function ($stateProvider, $urlRouterProvider, APP_CONFIG) {
  'use strict';

  $urlRouterProvider.otherwise(APP_CONFIG.states.HOME.url);

  $stateProvider.state(APP_CONFIG.states.HOME.name, {
    url: APP_CONFIG.states.HOME.url,
    templateUrl: '/bupa/core/home/Home.html',
    controller: 'BpHomeCtrl'
  });
});

angular.module('bupa.core.home').controller('BpHomeCtrl', function (APP_CONFIG, $scope) {
  'use strict';

  this.init = function () {
    $scope.APP_CONFIG = APP_CONFIG;
  };

  this.init();
});

angular.module('bupa.core.drugs', [
  'bupa.common.translations',
  'bupa-templates',
  'ui.router',
  'bupa.core.useful-documents',
  'bupa.core.useful-links'

]).config(function ($stateProvider, APP_CONFIG) {
  'use strict';

  $stateProvider.state(APP_CONFIG.states.DRUGS.name, {
    url: APP_CONFIG.states.DRUGS.url,
    templateUrl: '/bupa/core/drugs/Drugs.html',
    controller: 'BpDrugsCtrl'
  });
});

angular.module('bupa.core.drugs').service('bpDrugs', function ($window) {
  'use strict';

  return {
    getChargeCode: function (callback) {
      $window.ChargeCodeHomeController.getChargeCodeDrugs(callback, {escape: false, buffer: false});
    },
    getChargeCodeSchedule: function (callback) {
      $window.ChargeCodeHomeController.getChargeCodeScheduleDrugs(callback, {escape: false, buffer: false});
    },
    getChaptersDescription: function (callback) {
      $window.ChargeCodeHomeController.getChaptersDescriptionDrgus(callback, {escape: false, buffer: false});
    },
    getUnbundlingDiagnostic: function (callback) {
      $window.ChargeCodeHomeController.getUnbundlingDrugs(callback, {escape: false, buffer: false});
    }
  };
});

angular.module('bupa.core.drugs').controller('BpDrugsCtrl', function (APP_CONFIG, $scope, bpDrugs, $log, ngTableParams, $filter, $q, $window, $location, $sce, $timeout, SFDC) {
  'use strict';
  /*jshint camelcase: false */

  var self = this;

  var allChargeCode = [];
  var allChargeCodeSchedule;
  var chapterFiltered = [];

  this.init = function () {
    $scope.APP_CONFIG = APP_CONFIG;

    $scope.fetchPromise = self.fetch();

    $scope.allChapters = [{val: '--- Click here to view chapter pick list ---', number: '0'}];
    $scope._2MonthsAgo = new Date().setMonth(new Date().getMonth() - 2);
    $scope._6MonthsAgo = new Date().setMonth(new Date().getMonth() - 6);
    $scope.hideOnInit = true;
    $scope.currentTime = new Date();
    $scope.chapterNumber = '0';
    $scope.isChapterShow = false;
    $scope.isLoading = false;
    $scope.showSubSection = {};


    // records from the ChargeCode__c Object
    bpDrugs.getChargeCode(function (result, event) {

      if (event.status) {

        //we remove the "duplicate" sub records since we can't do that easily in apex..
        //we actually don't want to display twice (or more) the same chapters in the Chapter Column
        for (var i = result.length - 1; i >= 0; i--) {

          if (result[i].ChargeCodeSchedule__r && result[i].ChargeCodeSchedule__r.length > 0) {
            var chapters = result[i].ChargeCodeSchedule__r;
            var currentChapter = chapters[chapters.length - 1].Section_Name__c;

            //we format the chapters in one cell, add the tooltip to it, and we do it just at the
            //initialisation so that, we don't have to process that everytime we come on
            //a new page.
            if (currentChapter) {
              var chaptersSummarised = '<a tooltip-append-to-body="true" tooltip-placement="right" tooltip="' + currentChapter + '" ng-click="showChapter(\'' + currentChapter.split(' ')[0] + '\')">' + currentChapter.split(' ')[0] + '</a>';

              for (var j = chapters.length - 2; j >= 0; j--) {
                if (currentChapter === chapters[j].Section_Name__c) {
                  chapters.splice(j, 1);
                }
                else {
                  chaptersSummarised += ', <a tooltip-append-to-body="true" tooltip-placement="right" tooltip="' + chapters[j].Section_Name__c + '" ng-click="showChapter(\'' + chapters[j].Section_Name__c.split(' ')[0] + '\')">' + chapters[j].Section_Name__c.split(' ')[0] + '</a>';
                  currentChapter = chapters[j].Section_Name__c;
                }
              }

              result[i].chapters = chaptersSummarised;
            }
          }
        }

        allChargeCode = result;
        $log.debug('CH', result[0]);
        $scope.tableParams.reload();
        self.refreshChapterView();
      }
      else {
        $log.error(event.message);
      }
    });

    bpDrugs.getUnbundlingDiagnostic(function (result, event) {
      if (event.status) {
        $scope.allUnbundling = result;
      }
    });

    // records from the ChargeCodeSchedule__c Object, grouped in a Map by Section_Name__c
    bpDrugs.getChargeCodeSchedule(function (result, event) {
      if (event.status) {
        allChargeCodeSchedule = result;
        for (var key in result) {
          $scope.allChapters.push({val: key, number: key.split(' ')[0]});
        }

        self.refreshChapterView();
        $scope.$apply();

      } else {
        $log.error(event.message);
      }
    });

    // we get the description of the chapters
    bpDrugs.getChaptersDescription(function (result, event) {
      if (event.status) {

        $scope.allChaptersDescription = {};

        for (var key in result) {
          $scope.allChaptersDescription[key] = $sce.trustAsHtml(result[key]);
        }

        $scope.$apply();
      }
      else {
        $log.error(event.message);
      }
    });
  };

  this.fetch = function () {
    return $q.all([
      self.fetchChargeCodeSiteHelpTextCs(),
      self.fetchDiagnosticAttachmentWrappers()
    ]);
  };

  this.fetchChargeCodeSiteHelpTextCs = function () {
    return SFDC.getChargeCodeSiteHelpTextDiagnosticCMap().then(function (theChargeCodeSiteHelpTextCMap) {
      $scope.chargeCodeSiteHelpTextCMap = theChargeCodeSiteHelpTextCMap;
    });
  };

  this.fetchDiagnosticAttachmentWrappers = function () {
    return SFDC.getDiagnosticAttachmentWrapperList().then(function (theDiagnosticAttachmentWrapperList) {
      $scope.diagnosticAttachments = theDiagnosticAttachmentWrapperList;
    });
  };

  this.refreshChapterView = function () {
    var myChapter = $location.search();
    $log.debug('INIT METHOD', myChapter);
    // $scope.chapterNumber = '0';
    if (myChapter.chapter && $scope.allChapters) {
      $scope.isChapterShow = true;
      $scope.chapterNumber = myChapter.chapter;
      $scope.showChapter(myChapter.chapter);
    }
  };

  $scope.clearSelection = function () {
    $scope.isChapterShow = false;
    $scope.chapterNumber = '0';
    $scope.hideOnInit = true;
    $scope.tableParams.reload();
    $scope.tableParams.total(0);

  };

  //when the clear selection button is clicked
  $scope.backToMain = function () {
    $location.search('chapter', null);
    $scope.chapterNumber = '0';
    $scope.isChapterShow = false;
    $scope.tableParams.reload();
    //$scope.tableParams.count(15);
    $scope.showSubSection = {};
  };

  //whenever we go on a chapter, or go from chapter to chapter
  $scope.showChapter = function (number) {
    if (number > 0) {
      $scope.filter = '';
      $scope.isLoading = true;
      $timeout(function () {
        $scope.hideOnInit = false;
        $scope.chapterNumber = number;
        for (var i = $scope.allChapters.length - 1; i >= 0; i--) {
          if ($scope.allChapters[i].val.split(' ')[0] === number) {
            $scope.currentChapter = $scope.allChapters[i].val;
            break;
          }
        }

        $log.debug('showChapter Method');
        $location.search('chapter', number);
        $window.scrollTo(0, 0);
        $scope.showSubSection = {};
        $scope.isChapterShow = true;
        $scope.tableParams.page(1);
        chapterFiltered = [];


        $window.ChargeCodeHomeController.getChargeCodeDrugsNew($scope.currentChapter, function (result) {

          for (var j = result.length - 1; j >= 0; j--) {
            var chapters = result[j].ChargeCodeSchedule__r;
            var currentChapter = chapters[chapters.length - 1].Section_Name__c;
            if (currentChapter) {
              var chaptersSummarised = '<a tooltip-append-to-body="true" tooltip-placement="right" tooltip="' + currentChapter + '" ng-click="showChapter(\'' + currentChapter.split(' ')[0] + '\')">' + currentChapter.split(' ')[0] + '</a>';

              for (var k = chapters.length - 2; k >= 0; k--) {
                if (currentChapter === chapters[k].Section_Name__c) {
                  chapters.splice(k, 1);
                }
                else {
                  chaptersSummarised += ', <a tooltip-append-to-body="true" tooltip-placement="right" tooltip="' + chapters[k].Section_Name__c + '" ng-click="showChapter(\'' + chapters[k].Section_Name__c.split(' ')[0] + '\')">' + chapters[k].Section_Name__c.split(' ')[0] + '</a>';
                  currentChapter = chapters[k].Section_Name__c;
                }
              }

              result[j].chapters = chaptersSummarised;

              var temp = angular.copy(result[j]);

              if (chapters[chapters.length - 1].SubSectionName__c === undefined) {
                temp.SubSectionName__c = currentChapter.replace(/[0-9]/g, '');
              } else {
                temp.SubSectionName__c = chapters[chapters.length - 1].SubSectionName__c;
              }

              chapterFiltered.push(temp);
            }
          }

          $scope.tableParams.reload();
          $scope.isLoading = false;

        }, function (err) {
          $log.error('Fail in legacy code: ', err);
          $window.alert('An internal error has occurred. Please try refreshing your browser.');
        });
      }, 1, false);
    }
    else {
      $scope.clearSelection();
    }
  };

  function isNumber(o) {
    return !isNaN(o - 0) && o !== null && o !== '' && o !== false;
  }

  $scope.getUnbundlingCode = function (codeCharge) {
    $scope.unbundlingCode = codeCharge.Name;
    $scope.unbundlingDesc = codeCharge.Description__c;
  };

  $scope.showUnbundling = function (codeCharge) {

    if (angular.isUndefined($scope.allUnbundling)) {
      bpDrugs.getUnbundlingDiagnostic(function (result, event) {
        if (event.status) {
          $scope.allUnbundling = result;
        }
      });
    }

    var id = codeCharge.Id;

    var bundlings = $scope.allUnbundling[id];

    if (id === 'a0711000001chvcAAA') {
      $log.debug('Bundlings', id + '/' + bundlings);
    }
    return {items: bundlings};
  };

  $scope.sortChapters = function (a) {
    var val = a.number;
    if (isNumber(val)) {
      return parseInt(val);
    } else {
      return a.val;
    }
  };

  $scope.$watch('filter', function (newVal, oldVal) {

    if (newVal || oldVal) {
      $scope.hideOnInit = false;
      $log.debug('in the filter');

      $scope.tableParams.page(1);
      $scope.tableParams.reload();
    }
  });

  //the constructor of the ngTable
  $scope.tableParams = new ngTableParams({
    page: 1,
    count: 15,
    sorting: {
      SubSectionName__c: 'asc',
      Name: 'asc'
    }
  }, {
    groupBy: function (item) {
      return $scope.isChapterShow === true ? item.SubSectionName__c : '';
    },
    counts: [],
    total: 0,
    getData: function ($defer, params) {
      //we always hide the subsection when a change happens to the page(changement of page, filtering, ...)
      $scope.showSubSection = {};

      var currentSet = $scope.isChapterShow === true ? chapterFiltered : allChargeCode;

      //angular filter
      var filter = $scope.filter ? $scope.filter.toLowerCase() : '';
      var filteredData = $scope.filter ? $filter('filter')(
        currentSet,
        function (val) {
          return !(val.Name.toLowerCase().indexOf(filter) === -1 && val.Description__c.toLowerCase().indexOf(filter) === -1);
        })
        : currentSet;

      var orderedData = params.sorting() ? $filter('orderBy')(filteredData, params.orderBy()) : currentSet;

      if ($scope.hideOnInit !== true) {
        params.total(orderedData.length);
      }

      orderedData = orderedData.slice(
        (params.page() - 1) * params.count(),
        params.page() * params.count()
      );

      $log.info('Ordered data shown in the table:', orderedData);

      //we resolve the deferred function by setting the current dataset for the right page.
      $defer.resolve(orderedData);
    }
  });

  this.init();
  /*jshint camelcase: true */
});

angular.module('bupa.core.diagnostics', [
  'bupa.common.translations',
  'bupa-templates',
  'ui.router',
  'bupa.core.useful-documents',
  'bupa.core.useful-links'

]).config(function ($stateProvider, APP_CONFIG) {
  'use strict';

  $stateProvider.state(APP_CONFIG.states.DIAGNOSTICS.name, {
    url: APP_CONFIG.states.DIAGNOSTICS.url,
    templateUrl: '/bupa/core/diagnostics/Diagnostics.html',
    controller: 'BpDiagnosticsCtrl'
  });
});

angular.module('bupa.core.diagnostics').service('bpDiagnostics', function ($window) {
  'use strict';

  return {
    getChargeCode: function (callback) {
      $window.ChargeCodeHomeController.getChargeCodeDiagnostic(callback, {escape: false, buffer: false});
    },
    getChargeCodeSchedule: function (callback) {
      $window.ChargeCodeHomeController.getChargeCodeScheduleDiagnostic(callback, {escape: false, buffer: false});
    },
    getChaptersDescription: function (callback) {
      $window.ChargeCodeHomeController.getChaptersDescriptionDiagnostic(callback, {escape: false, buffer: false});
    },
    getUnbundlingDiagnostic: function (callback) {
      $window.ChargeCodeHomeController.getUnbundlingDiagnostic(callback, {escape: false, buffer: false});
    }
  };
});

angular.module('bupa.core.diagnostics').controller('BpDiagnosticsCtrl', function (APP_CONFIG, $scope, bpDiagnostics, $log, ngTableParams, $filter, $q, $window, $location, $sce, $timeout, SFDC) {
  'use strict';
  /*jshint camelcase: false */

  var self = this;

  var allChargeCode = [];
  var allChargeCodeSchedule;
  var chapterFiltered = [];

  this.init = function () {
    $scope.APP_CONFIG = APP_CONFIG;

    $scope.fetchPromise = self.fetch();

    $scope.allChapters = [{val: '--- Click here to view chapter pick list ---', number: '0'}];
    $scope._2MonthsAgo = new Date().setMonth(new Date().getMonth() - 2);
    $scope._6MonthsAgo = new Date().setMonth(new Date().getMonth() - 6);
    $scope.hideOnInit = true;
    $scope.currentTime = new Date();
    $scope.chapterNumber = '0';
    $scope.isChapterShow = false;
    $scope.isLoading = false;
    $scope.showSubSection = {};


    // records from the ChargeCode__c Object
    bpDiagnostics.getChargeCode(function (result, event) {

      if (event.status) {

        //we remove the "duplicate" sub records since we can't do that easily in apex..
        //we actually don't want to display twice (or more) the same chapters in the Chapter Column
        for (var i = result.length - 1; i >= 0; i--) {

          if (result[i].ChargeCodeSchedule__r && result[i].ChargeCodeSchedule__r.length > 0) {
            var chapters = result[i].ChargeCodeSchedule__r;
            var currentChapter = chapters[chapters.length - 1].Section_Name__c;

            //we format the chapters in one cell, add the tooltip to it, and we do it just at the
            //initialisation so that, we don't have to process that everytime we come on
            //a new page.
            if (currentChapter) {
              var chaptersSummarised = '<a tooltip-append-to-body="true" tooltip-placement="right" tooltip="' + currentChapter + '" ng-click="showChapter(\'' + currentChapter.split(' ')[0] + '\')">' + currentChapter.split(' ')[0] + '</a>';

              for (var j = chapters.length - 2; j >= 0; j--) {
                if (currentChapter === chapters[j].Section_Name__c) {
                  chapters.splice(j, 1);
                }
                else {
                  chaptersSummarised += ', <a tooltip-append-to-body="true" tooltip-placement="right" tooltip="' + chapters[j].Section_Name__c + '" ng-click="showChapter(\'' + chapters[j].Section_Name__c.split(' ')[0] + '\')">' + chapters[j].Section_Name__c.split(' ')[0] + '</a>';
                  currentChapter = chapters[j].Section_Name__c;
                }
              }

              result[i].chapters = chaptersSummarised;
            }
          }
        }

        allChargeCode = result;
        $log.debug('CH', result[0]);
        $scope.tableParams.reload();
        self.refreshChapterView();
      }
      else {
        $log.error(event.message);
      }
    });

    bpDiagnostics.getUnbundlingDiagnostic(function (result, event) {
      if (event.status) {
        $scope.allUnbundling = result;
      }
    });

    // records from the ChargeCodeSchedule__c Object, grouped in a Map by Section_Name__c
    bpDiagnostics.getChargeCodeSchedule(function (result, event) {
      if (event.status) {
        allChargeCodeSchedule = result;
        for (var key in result) {
          $scope.allChapters.push({val: key, number: key.split(' ')[0]});
        }

        self.refreshChapterView();
        $scope.$apply();

      } else {
        $log.error(event.message);
      }
    });

    // we get the description of the chapters
    bpDiagnostics.getChaptersDescription(function (result, event) {
      if (event.status) {

        $scope.allChaptersDescription = {};

        for (var key in result) {
          $scope.allChaptersDescription[key] = $sce.trustAsHtml(result[key]);
        }

        $scope.$apply();
      }
      else {
        $log.error(event.message);
      }
    });
  };

  this.fetch = function () {
    return $q.all([
      self.fetchChargeCodeSiteHelpTextCs(),
      self.fetchDiagnosticAttachmentWrappers()
    ]);
  };

  this.fetchChargeCodeSiteHelpTextCs = function () {
    return SFDC.getChargeCodeSiteHelpTextDiagnosticCMap().then(function (theChargeCodeSiteHelpTextCMap) {
      $scope.chargeCodeSiteHelpTextCMap = theChargeCodeSiteHelpTextCMap;
    });
  };

  this.fetchDiagnosticAttachmentWrappers = function () {
    return SFDC.getDiagnosticAttachmentWrapperList().then(function (theDiagnosticAttachmentWrapperList) {
      $scope.diagnosticAttachments = theDiagnosticAttachmentWrapperList;
    });
  };

  this.refreshChapterView = function () {
    var myChapter = $location.search();
    $log.debug('INIT METHOD', myChapter);
    // $scope.chapterNumber = '0';
    if (myChapter.chapter && $scope.allChapters) {
      $scope.isChapterShow = true;
      $scope.chapterNumber = myChapter.chapter;
      $scope.showChapter(myChapter.chapter);
    }
  };

  $scope.clearSelection = function () {
    $scope.isChapterShow = false;
    $scope.chapterNumber = '0';
    $scope.hideOnInit = true;
    $scope.tableParams.reload();
    $scope.tableParams.total(0);

  };

  //when the clear selection button is clicked
  $scope.backToMain = function () {
    $location.search('chapter', null);
    $scope.chapterNumber = '0';
    $scope.isChapterShow = false;
    $scope.tableParams.reload();
    //$scope.tableParams.count(15);
    $scope.showSubSection = {};
  };

  //whenever we go on a chapter, or go from chapter to chapter
  $scope.showChapter = function (number) {
    if (number > 0) {
      $scope.filter = '';
      $scope.isLoading = true;
      $timeout(function () {
        $scope.hideOnInit = false;
        $scope.chapterNumber = number;
        for (var i = $scope.allChapters.length - 1; i >= 0; i--) {
          if ($scope.allChapters[i].val.split(' ')[0] === number) {
            $scope.currentChapter = $scope.allChapters[i].val;
            break;
          }
        }

        $log.debug('showChapter Method');
        $location.search('chapter', number);
        $window.scrollTo(0, 0);
        $scope.showSubSection = {};
        $scope.isChapterShow = true;
        $scope.tableParams.page(1);
        chapterFiltered = [];


        $window.ChargeCodeHomeController.getChargeCodeDiagnosticNew($scope.currentChapter, function (result) {

          for (var j = result.length - 1; j >= 0; j--) {
            var chapters = result[j].ChargeCodeSchedule__r;
            var currentChapter = chapters[chapters.length - 1].Section_Name__c;
            if (currentChapter) {
              var chaptersSummarised = '<a tooltip-append-to-body="true" tooltip-placement="right" tooltip="' + currentChapter + '" ng-click="showChapter(\'' + currentChapter.split(' ')[0] + '\')">' + currentChapter.split(' ')[0] + '</a>';

              for (var k = chapters.length - 2; k >= 0; k--) {
                if (currentChapter === chapters[k].Section_Name__c) {
                  chapters.splice(k, 1);
                }
                else {
                  chaptersSummarised += ', <a tooltip-append-to-body="true" tooltip-placement="right" tooltip="' + chapters[k].Section_Name__c + '" ng-click="showChapter(\'' + chapters[k].Section_Name__c.split(' ')[0] + '\')">' + chapters[k].Section_Name__c.split(' ')[0] + '</a>';
                  currentChapter = chapters[k].Section_Name__c;
                }
              }

              result[j].chapters = chaptersSummarised;

              var temp = angular.copy(result[j]);

              if (chapters[chapters.length - 1].SubSectionName__c === undefined) {
                temp.SubSectionName__c = currentChapter.replace(/[0-9]/g, '');
              } else {
                temp.SubSectionName__c = chapters[chapters.length - 1].SubSectionName__c;
              }

              chapterFiltered.push(temp);
            }
          }

          $scope.tableParams.reload();
          $scope.isLoading = false;

        }, function (err) {
          $log.error('Fail in legacy code: ', err);
          $window.alert('An internal error has occurred. Please try refreshing your browser.');
        });
      }, 1, false);
    }
    else {
      $scope.clearSelection();
    }
  };

  function isNumber(o) {
    return !isNaN(o - 0) && o !== null && o !== '' && o !== false;
  }

  $scope.getUnbundlingCode = function (codeCharge) {
    $scope.unbundlingCode = codeCharge.Name;
    $scope.unbundlingDesc = codeCharge.Description__c;
  };

  $scope.showUnbundling = function (codeCharge) {

    if (angular.isUndefined($scope.allUnbundling)) {
      bpDiagnostics.getUnbundlingDiagnostic(function (result, event) {
        if (event.status) {
          $scope.allUnbundling = result;
        }
      });
    }

    var id = codeCharge.Id;

    var bundlings = $scope.allUnbundling[id];

    if (id === 'a0711000001chvcAAA') {
      $log.debug('Bundlings', id + '/' + bundlings);
    }
    return {items: bundlings};
  };

  $scope.sortChapters = function (a) {
    var val = a.number;
    if (isNumber(val)) {
      return parseInt(val);
    } else {
      return a.val;
    }
  };

  $scope.$watch('filter', function (newVal, oldVal) {

    if (newVal || oldVal) {
      $scope.hideOnInit = false;
      $log.debug('in the filter');

      $scope.tableParams.page(1);
      $scope.tableParams.reload();
    }
  });

  //the constructor of the ngTable
  $scope.tableParams = new ngTableParams({
    page: 1,
    count: 15,
    sorting: {
      SubSectionName__c: 'asc',
      Name: 'asc'
    }
  }, {
    groupBy: function (item) {
      return $scope.isChapterShow === true ? item.SubSectionName__c : '';
    },
    counts: [],
    total: 0,
    getData: function ($defer, params) {
      //we always hide the subsection when a change happens to the page(changement of page, filtering, ...)
      $scope.showSubSection = {};

      var currentSet = $scope.isChapterShow === true ? chapterFiltered : allChargeCode;

      //angular filter
      var filter = $scope.filter ? $scope.filter.toLowerCase() : '';
      var filteredData = $scope.filter ? $filter('filter')(
        currentSet,
        function (val) {
          return !(val.Name.toLowerCase().indexOf(filter) === -1 && val.Description__c.toLowerCase().indexOf(filter) === -1);
        })
        : currentSet;

      var orderedData = params.sorting() ? $filter('orderBy')(filteredData, params.orderBy()) : currentSet;

      if ($scope.hideOnInit !== true) {
        params.total(orderedData.length);
      }

      orderedData = orderedData.slice(
        (params.page() - 1) * params.count(),
        params.page() * params.count()
      );

      $log.info('Ordered data shown in the table:', orderedData);

      //we resolve the deferred function by setting the current dataset for the right page.
      $defer.resolve(orderedData);
    }
  });

  this.init();
  /*jshint camelcase: true */
});

angular.module('bupa.core.contact-us', [
  'bupa.common.translations',
  'ui.router',
  'bupa-templates'

]).config(function ($stateProvider, APP_CONFIG) {
  'use strict';

  $stateProvider.state(APP_CONFIG.states.CONTACT_US.name, {
    url: APP_CONFIG.states.CONTACT_US.url,
    templateUrl: '/bupa/core/contact-us/ContactUs.html',
    controller: 'ContactUsCtrl'
  });
});



angular.module('bupa.core.contact-us').service('bpContactUs', function (APP_CONFIG, $q, $log, $window) {
  'use strict';

  this.saveFeedback = function (theFeedback) {
    $log.debug('saveFeedback() theFeedback: ', theFeedback);

    var deferred = $q.defer();

    $window.ChargeCodeHomeController.saveFeedback(theFeedback, function (result) {

      $log.debug('ChargeCodeHomeController.saveFeedback() => ', result);
      deferred.resolve(result);

    }, function (err) {
      $log.error('Fail in ChargeCodeHomeController.saveFeedback: ', err);
      deferred.reject(err);
    });

    return deferred.promise;
  };
});

angular.module('bupa.core.contact-us').controller('ContactUsCtrl', function (APP_CONFIG, SFDC, $scope, $log, bpContactUs) {
  'use strict';

  this.init = function () {
    $scope.APP_CONFIG = APP_CONFIG;
  };

  $scope.onContactUsFormSubmit = function (feedback, feedbackFormCtrl) {
    $log.debug('Submitting feedback: ', feedback);
    $log.debug('feedbackFormCtrl: ', feedbackFormCtrl);

    if (feedbackFormCtrl.$invalid) {
      return;
    }

    bpContactUs.saveFeedback(feedback).catch(function () {
      $scope.requestSucceded = false;
    }).then(function () {
      $scope.requestSucceded = true;
    });
  };

  this.init();
});

angular.module('bupa.core.benefit-maxima', [
  'bupa.common',
  'ngLazyJs',
  'cgBusy',
  'mgcrea.ngStrap.modal'
]);

angular.module('bupa.core.benefit-maxima').service('bpBenefitMaxima', function (SFDC) {
  'use strict';

  this.fetchMaximaBenefits = function () {
    return SFDC.getMaximaBenefit();
  };
});

angular.module('bupa.core.benefit-maxima').controller('BenefitMaximaCtrl', function ($q, $scope, bpBenefitMaxima) {
  'use strict';

  var self = this;

  this.init = function () {

    $scope.lengthBenefit = [1, 2, 3, 4, 5];

    $scope.fetchPromise = self.fetch();
  };

  this.fetch = function () {
    return $q.all([
      self.fetchMaximaBenefits()
    ]);
  };

  this.fetchMaximaBenefits = function () {
    return bpBenefitMaxima.fetchMaximaBenefits().then(function (theMaximaBenefits) {
      $scope.maximaBenefits = theMaximaBenefits;
    });
  };

  this.init();
});

angular.module('bupa.core.appendices', [
  'bupa.common',
  'ngLazyJs',
  'cgBusy',
  'mgcrea.ngStrap.modal'
]);

angular.module('bupa.core.appendices').service('bpAppendices', function (ngLazy, SFDC) {
  'use strict';

  var self = this;

  this.fetchAppendices = function () {
    return SFDC.getScheduleChapterCList().then(function (theScheduleChapterCList) {
      return ngLazy(theScheduleChapterCList).filter(self.appendicesPredicate).value();
    });
  };

  this.appendicesPredicate = function (aScheduleChapterC) {
    /*jshint camelcase: false */
    return aScheduleChapterC.Type__c === 'Appendix';
    /*jshint camelcase: true */
  };

});

angular.module('bupa.core.appendices').controller('AppendicesCtrl', function ($q, $scope, bpAppendices) {
  'use strict';

  var self = this;

  this.init = function () {
    $scope.fetchPromise = self.fetch();
  };

  this.fetch = function () {
    return $q.all([
      self.fetchAppendices()
    ]);
  };

  this.fetchAppendices = function () {
    return bpAppendices.fetchAppendices().then(function (theAppendices) {
      $scope.appendices = theAppendices;
    });
  };

  this.init();

});

angular.module('bupa.common.translations', [
  'pascalprecht.translate'

]).config(function ($translateProvider, BP_VISUAL_FORCE_CUSTOM_LABELS) {
  'use strict';

  var englishTranslations = angular.extend({
    TITLE: 'Hello',
    FOO: 'This is a paragraph.',
    BUTTON_LANG_EN: 'english'
  }, BP_VISUAL_FORCE_CUSTOM_LABELS);

  $translateProvider.translations('en', englishTranslations);

  $translateProvider.preferredLanguage('en');

}).constant('BP_VISUAL_FORCE_CUSTOM_LABELS', window.$SFDCLabels);

angular.module('bupa.common.footer', [
  'bupa.common.translations',
  'config'
]);

angular.module('bupa.common.footer').controller('BpFooterCtrl', function (APP_CONFIG, $scope) {
  'use strict';

  this.init = function () {
    $scope.APP_CONFIG = APP_CONFIG;
  };

  this.init();

});

angular.module('bupa.common.navbar', [
  'bupa.common.translations',
  'config'
]);

angular.module('bupa.common.navbar').directive('bpNavBar', function () {
  'use strict';
  return {
    templateUrl: '/bupa/common/navbar/NavBar.html',
    controller: 'NavBarCtrl',
    scope: {
      bupaNavBarClasses: '@',
      titleTextKey: '='
    }
  };
});

angular.module('bupa.common.navbar').controller('NavBarCtrl', function (APP_CONFIG, $scope, $state) {
  'use strict';

  this.init = function () {
    $scope.$state = $state;
    $scope.APP_CONFIG = APP_CONFIG;
  };

  this.init();
});

angular.module('ngLazyJs', [])

  .constant('Lazy', window.Lazy)

// JSHint warns about using a constructor function (any function with a capitalised name) so here's the alternative for people who want to use JSHint and care about it.
  .constant('ngLazy', window.Lazy);

angular.module('bupa.core', [
  'bupa.core.home',
  'bupa.core.procedures',
  'bupa.core.diagnostics',
  'bupa.core.contact-us',
  'bupa.core.essential-notes',
  'bupa.core.benefit-maxima',
  'bupa.core.appendices',
  'bupa.core.drugs'
]);

/*jshint camelcase: false */
angular.module('bupa.core').factory('bpSharedCode', function ($location, $log, $sce, $window) {
  'use strict';

  //stateful accross application
  var purchasedCodeCharges = [];

  //to detect whether a string can be a number (unlike angular one)
  function isNumber(o) {
    return !isNaN(o - 0) && o !== null && o !== '' && o !== false;
  }

  function calculator_CalculatePrice(allUnbundlings) {
    //we set the price of the standard fields into the custom fields
    calculator_InitCartPriceDisplay();

    //calculate the price for unbundling.
    calculator_UnbundlingCart(allUnbundlings);

    //the asterisk rule + (ii) rule
    calculator_ExceptionRule();

    //multiple procedures
    calculator_MultipleProcedures();
  }

  //for (re)initialising the price from the salesforce fields, to a custom field (the custom field is use for the UI
  //and might be different than the salesforce price)
  function calculator_InitCartPriceDisplay() {
    for (var i = purchasedCodeCharges.length - 1; i >= 0; i--) {
      purchasedCodeCharges[i].Surgeon_Price = purchasedCodeCharges[i].Surgeon_Price__c || 0;
      purchasedCodeCharges[i].Anaesthetist_Price = purchasedCodeCharges[i].Anaesthetist_Price__c || 0;
      purchasedCodeCharges[i].displayedName = purchasedCodeCharges[i].Name;
    }
  }

  //'Cross reference all added codes against each other, if any match unbundling table then 0 price the lower value
  //i.e. if four codes are chosen to be calculated, check 1 v 2, 1 v 3, 1 v 4, 2 v 3, 2 v 4, 3 v 4.
  function calculator_UnbundlingCart(allUnbundlings) {
    for (var i = purchasedCodeCharges.length - 1; i >= 0; i--) {
      //we get the unbundlings for the current purchased charge code
      var currentUnbundlings = allUnbundlings[purchasedCodeCharges[i].Id];
      if (currentUnbundlings) {
        //we check whether there is an unbundling in one of the purchased charge code.
        for (var j = currentUnbundlings.length - 1; j >= 0; j--) {
          for (var k = purchasedCodeCharges.length - 1; k >= 0; k--) {
            //if true, there is one. We need to set the lowest price to 0.
            if (currentUnbundlings[j].UnbundlingChargeCode__c === purchasedCodeCharges[k].Id) {
              //we compare between the original element (i) and the found purchased code (k)
              //surgeon price
              if (purchasedCodeCharges[k].Surgeon_Price__c &&
                purchasedCodeCharges[k].Surgeon_Price__c < purchasedCodeCharges[i].Surgeon_Price__c) {
                purchasedCodeCharges[k].Surgeon_Price = 0;
              }

              //anaethetist price
              if (purchasedCodeCharges[k].Anaesthetist_Price__c &&
                purchasedCodeCharges[k].Anaesthetist_Price__c < purchasedCodeCharges[i].Anaesthetist_Price__c) {
                purchasedCodeCharges[k].Anaesthetist_Price = 0;
              }
            }
          }
        }
      }
    }
  }

  // If non 0 priced code on calculator is X3510, 25040, X3800
  // Then check if all other codes in the calculator have a * footnote.
  // If all other codes do not have a * then 0 price the X3510, 25040, X3800 code

  //If code on calculator is 20310 then check if all other codes have a (ii) footnote.
  //If all other codes do not have a (ii) footnote then add note saying '20310 not permitted to be
  //charged for same date of service' (20310 won't have price as unique for each consultant)
  //Source for footnotes is code record in Salesforce.
  function calculator_ExceptionRule() {
    var txt20310 = '20310 not permitted to be charged for same date of service';
    var rule = function (specialCodes, field, charVal) {
      for (var i = purchasedCodeCharges.length - 1; i >= 0; i--) {
        $log.debug('purchasedCodeCharges[i].Name ', purchasedCodeCharges[i]);
        if ($window.Lazy(specialCodes).contains(purchasedCodeCharges[i].Name) &&
          (purchasedCodeCharges[i].Surgeon_Price ||
          purchasedCodeCharges[i].Anaesthetist_Price)) {
          $log.debug('passed first if:', charVal, 'purchased code:', purchasedCodeCharges);
          //we check whether all other codes have a * in the footnote
          for (var j = purchasedCodeCharges.length - 1; j >= 0; j--) {
            //we ignore the special codes
            if (!$window.Lazy(specialCodes).contains(purchasedCodeCharges[j].Name) &&
              purchasedCodeCharges[j][field] !== charVal) {

              //found at least one, we set the price of the special code to 0.
              purchasedCodeCharges[i].Surgeon_Price = 0;
              purchasedCodeCharges[i].Anaesthetist_Price = 0;

              if (purchasedCodeCharges[i].Name === '20310') {
                $log.debug('adding the special note...');
                //we need to add a special note
                purchasedCodeCharges[i].displayedName = '<a tooltip="' + txt20310 + '">20310</a>';
              }
            }
          }
        }
      }
    };

    rule(['X3510', '25040', 'X3800'], 'Footnote_asterisk_read_only_for_SOP__c', '*');
    rule(['20310'], 'Footnote_ii__c', '(ii)');
  }

  //(Have assumed that calculator is for treatment on same date of service)
  //If three or more lines remaining non 0 price and have surgeon category / price in Salesforce,
  //0 price all lines except the two with the highest surgeon fixed price (will need to convert complexity
  //into fixed price as some procedures i.e. G8080 have fixed price)
  //If both remaining lines have the same fixed price, take 50% of one.
  //If one remaining line has lower fixed price, display 50% of this lower price.
  //Note from Craig --The multiple procedure rule is about the most complex rules in our Haley rules
  //system and the one Lavanya is most nervous about moving to Inrule. There's a danger we rebuild the rules
  //engine in Salesforce. Hence key for Lavanya to be involved.
  function calculator_MultipleProcedures() {
    var non0 = 0;
    $window.Lazy(purchasedCodeCharges)
      .sortBy(function (cc) {
        return cc.Surgeon_Price;
      })
      .each(function (cc, counter) {
        if (cc.Surgeon_Price > 0) {
          non0++;
        }

        if (non0 >= 2 && counter === purchasedCodeCharges.length - 2) {
          //we have at least 3 non 0 surgeon purchased charge code, we set the 2nd to 50%
          cc.Surgeon_Price /= 2;
          cc.Anaesthetist_Price /= 2;
        }
        if (counter < purchasedCodeCharges.length - 2) {
          //all after the 2 top price are set to 0.
          cc.Surgeon_Price = 0;
          cc.Anaesthetist_Price = 0;
        }
      });
  }

  return {
    //most functions are the same in Procedures like in Diagnostics, hence they are in this service.
    backToMain: function ($scope, allChargeCode) {
      $scope.isChapterShow = false;
      $location.search('chapter', null);
      $scope.chapterNumber = '0';
      $scope.chargeCode = allChargeCode;
      $scope.tableParams.reload();
      // $scope.tableParams.count(15);
      $scope.showSubSection = {};
    },


    //just for sorting alphabetically the chapters
    sortChapters: function (a) {
      var val = a.number;
      if (isNumber(val)) {
        return parseInt(val);
      }
      else {
        return a.val;
      }
    },
    //block for handling data coming from Salesforce, executed only once at the initilisation.
    //some data are 'concatenated' for reducing the number altogether of binding on the table.
    handleInitResponse: function (resp, isProcedure) {
      var helpTexts = resp.helpTexts;
      //we remove the 'duplicate' sub records since we can't do that easily in apex..
      //we actually don't want to display twice (or more) the same chapters in the Chapter Column
      var tmplDefaultTooltip = function (tooltipTxt, desc) {
        return '<a tooltip="' + tooltipTxt + '">' + desc + '</a>';
      };

      var tmplChapters = function (cc) {
        var key = cc.Section_Name__c.split(' ')[0];
        return '<a ng-click="chapters.showChapter(\'' + key + '\')" tooltip="' + cc.Section_Name__c + '">' + key + '</a>';
      };

      var getChapters = function (a) {
        return a && $window.Lazy(a)
            .uniq('Section_Name__c')
            .reject({'Section_Name__c': undefined})
            .map(tmplChapters).join(', ');
      };

      var getCategories = function (category, price) {
        return $sce.trustAsHtml(
          (category !== 'Cash Value' ? (category + '<br>') : '') +
          (category !== '-' ? ('£' + price) : '')
        );
      };

      var getNameFootnote = function (cc) {
        return cc.Name + '<br/>' +
          (cc.Footnote_i__c ? tmplDefaultTooltip(helpTexts['Footnote_i__c'].HelpText__c, cc.Footnote_i__c) : '') +
          (cc.Footnote_ii__c ? tmplDefaultTooltip(helpTexts['Footnote_ii__c'].HelpText__c, cc.Footnote_ii__c) : '') +
          (cc.Footnote_asterisk_read_only_for_SOP__c ? tmplDefaultTooltip(helpTexts['Footnote_Asterik__c'].HelpText__c, cc.Footnote_asterisk_read_only_for_SOP__c) : '') +
          (cc.Footnote_R__c ? tmplDefaultTooltip(helpTexts['Footnote_R__c'].HelpText__c, cc.Footnote_R__c) : '') +
          (cc.Footnote_X__c ? tmplDefaultTooltip(helpTexts['Footnote_X__c'].HelpText__c, cc.Footnote_X__c) : '');
      };

      var getAnticipatedLOS = function (cc) {
        return tmplDefaultTooltip(helpTexts[cc.Anticipated_LOS__c] ? helpTexts[cc.Anticipated_LOS__c].HelpText__c : '', cc.Anticipated_LOS__c);
      };

      $window.Lazy(resp.chargeCode).each(function (cc) {
        //we 'prepare' some data for reducing the number of 2 way bindings.
        cc.chapters = getChapters(cc.ChargeCodeSchedule__r);
        cc.nameFootnote = getNameFootnote(cc);

        if (isProcedure) {
          cc.surgeon = getCategories(cc.Surgeons_Category__c, cc.Surgeon_Price__c);
          cc.anaes = getCategories(cc.Anaesthetists_Category__c, cc.Anaesthetist_Price__c);
          cc.anticipatedLOS = getAnticipatedLOS(cc);
        }
        //for assigning the right script template (ux-datagrid)
        cc._template = 'default';
      });

      $window.Lazy(resp.chargeCodeSchedule).pairs().map(function (cc) {
        $window.Lazy(cc[1]).each(function (cc) {
          cc.chapters = getChapters([cc]);
          if (cc.ChargeCode__r) {
            if (isProcedure) {
              cc.surgeon = getCategories(cc.ChargeCode__r.Surgeons_Category__c, cc.ChargeCode__r.Surgeon_Price__c);
              cc.anaes = getCategories(cc.ChargeCode__r.Anaesthetists_Category__c, cc.ChargeCode__r.Anaesthetist_Price__c);
              cc.anticipatedLOS = getAnticipatedLOS(cc.ChargeCode__r);
            }
            cc.nameFootnote = getNameFootnote(cc.ChargeCode__r);
          }
          if (!cc.SubSectionName__c && angular.isString(cc.Section_Name__c)) {
            cc.SubSectionName__c = cc.Section_Name__c.replace(/[0-9]/g, '');
          }
        });
      }).toArray();
      return resp;
    },
    //initialise especially the chapters, the correct view.
    initScope: function ($scope, resp) {
      $scope.chargeCode = resp.chargeCode;

      for (var key in resp.chargeCodeSchedule) {
        $scope.allChapters.push({val: key, number: key.split(' ')[0]});
      }

      //init the view.
      var myChapter = $location.search();
      if (myChapter.chapter && $scope.allChapters) {
        $scope.isChapterShow = true;
        $scope.chapterNumber = myChapter.chapter;
        $scope.chapters.showChapter(myChapter.chapter);
      }
      else {
        $scope.chapterNumber = '0';
      }
    },
    //to detect whether we are running on Mac or not (used for adding a fake 'column' on non Mac browser
    // (because of the scrolling bar on Linux & Windows))
    isMac: function () {
      return $window.navigator.platform.indexOf('Mac') > -1;
    },

    //3 next functions for the Shopping Cart management
    getPurchasedChargeCodes: function () {
      console.log('in get command', purchasedCodeCharges);
      return purchasedCodeCharges;
    },
    addPurchasedChargeCode: function (codeCharge, allUnbundlings) {
      purchasedCodeCharges.push(codeCharge);
      calculator_CalculatePrice(allUnbundlings);
    },
    removePurchasedChargeCode: function (chargeCode, allUnbundlings) {
      console.log("removePurchasedChargeCode " + chargeCode)
      for (var i = purchasedCodeCharges.length - 1; i >= 0; i--) {
        if (purchasedCodeCharges[i].Name === chargeCode) {
          console.log("removing code matched code" + chargeCode + " matched name" + purchasedCodeCharges[i].Name)
          purchasedCodeCharges.splice(i, 1);
          console.log(purchasedCodeCharges); //splice has done correct job
          break;
        }
      }

      calculator_CalculatePrice(allUnbundlings);
    }

  };
});
/*jshint camelcase: true */

angular.module('bupa.core').factory('SFDC', function(APP_CONFIG, $q, $http, $log, $window, $timeout, $cacheFactory) {
  'use strict';

  var self = this;

  this._cache = null;

  this.init = function() {
    self._cache = $cacheFactory('bupa.core.SFDC.cache');
    self._preFetchIfConfigured();
  };

  var handleReq = function(remoteCall) {
    var defer = $q.defer();
    remoteCall(
      function(result, event) {
        if (event.status) {
          defer.resolve(result);
        } else {
          $log.error(event.message);
          defer.reject(event.message);
        }
      },

      {escape: false, buffer: false}
    );
    return defer.promise;
  };

  var getMockResponse = function(mockJsonFilePath) {
    return $http.get(mockJsonFilePath).then(function(mockResponse) {
      $log.debug(mockJsonFilePath, ' => Mock Response =>', mockResponse);
      var theData = mockResponse.data;
      var theDataObject = theData.pop();
      return theDataObject.result;
    });
  };

  var computeFileSizeInKb = function(anAttachmentWrapper) {
    var anAttachment = anAttachmentWrapper.attachment;
    anAttachment.fileSizeInKB = anAttachment.BodyLength / 1024;
    anAttachment.fileSizeInKB = Math.round(anAttachment.fileSizeInKB);
  };

  var computeFileExtension = function(anAttachmentWrapper) {

    var anAttachment = anAttachmentWrapper.attachment;
    var name = anAttachment.Name;
    if (angular.isString(name) && name.indexOf('.') > -1) {
      anAttachment.fileType = name.substring(name.lastIndexOf('.') + 1);
    } else {
      anAttachment.fileType = '';
    }
  };

  var preProcessScheduleAttachmentWrapperList = function(theScheduleAttachmentWrapperList) {
    angular.forEach(theScheduleAttachmentWrapperList, computeFileSizeInKb);
    angular.forEach(theScheduleAttachmentWrapperList, computeFileExtension);
    return theScheduleAttachmentWrapperList;
  };

  var service = {
    getChargeCodeSiteHelpText: function() {

      var cacheKey = 'getChargeCodeSiteHelpText';
      var cachedResponsePromise = self._cache.get(cacheKey);

      if (angular.isObject(cachedResponsePromise)) {
        return cachedResponsePromise;
      }

      var responsePromise = handleReq($window.ChargeCodeHomeController.getChargeCodeSiteHelpText);
      self._cache.put(cacheKey, responsePromise);
      return responsePromise;
    },

    getChargeCode: function() {

      var cacheKey = 'getChargeCode';
      var cachedResponsePromise = self._cache.get(cacheKey);

      if (angular.isObject(cachedResponsePromise)) {
        return cachedResponsePromise;
      }

      var responsePromise;
      if (APP_CONFIG.SF_ORG.IsSandbox && angular.isString(APP_CONFIG.mocks.PROD.getChargeCode)) {
        responsePromise = getMockResponse(APP_CONFIG.mocks.PROD.getChargeCode);
      } else {
        responsePromise = handleReq($window.ChargeCodeHomeController.getChargeCode);
      }

      self._cache.put(cacheKey, responsePromise);
      return responsePromise;
    },

    getChargeCodeSchedule: function() {

      var cacheKey = 'getChargeCodeSchedule';
      var cachedResponsePromise = self._cache.get(cacheKey);

      if (angular.isObject(cachedResponsePromise)) {
        return cachedResponsePromise;
      }

      var responsePromise;
      if (APP_CONFIG.SF_ORG.IsSandbox && angular.isString(APP_CONFIG.mocks.PROD.getChargeCodeSchedule)) {
        responsePromise = getMockResponse(APP_CONFIG.mocks.PROD.getChargeCodeSchedule);
      } else {
        responsePromise = handleReq($window.ChargeCodeHomeController.getChargeCodeSchedule);
      }

      self._cache.put(cacheKey, responsePromise);
      return responsePromise;
    },

    getCodingRequest: function() {

      var cacheKey = 'getCodingRequest';
      var cachedResponsePromise = self._cache.get(cacheKey);

      if (angular.isObject(cachedResponsePromise)) {
        return cachedResponsePromise;
      }

      var responsePromise = handleReq($window.ChargeCodeHomeController.getCodingRequest);
      self._cache.put(cacheKey, responsePromise);
      return responsePromise;
    },

    getUnbundling: function() {

      var cacheKey = 'getUnbundling';
      var cachedResponsePromise = self._cache.get(cacheKey);

      if (angular.isObject(cachedResponsePromise)) {
        return cachedResponsePromise;
      }

      var responsePromise;
      if (APP_CONFIG.SF_ORG.IsSandbox && angular.isString(APP_CONFIG.mocks.PROD.getUnbundling)) {
        responsePromise = getMockResponse(APP_CONFIG.mocks.PROD.getUnbundling);
      } else {
        responsePromise = handleReq($window.ChargeCodeHomeController.getUnbundling);
      }

      self._cache.put(cacheKey, responsePromise);
      return responsePromise;
    },

    getChaptersDescription: function() {

      var cacheKey = 'getChaptersDescription';
      var cachedResponsePromise = self._cache.get(cacheKey);

      if (angular.isObject(cachedResponsePromise)) {
        return cachedResponsePromise;
      }

      var responsePromise;
      if (APP_CONFIG.SF_ORG.IsSandbox && angular.isString(APP_CONFIG.mocks.PROD.getChaptersDescription)) {
        responsePromise = getMockResponse(APP_CONFIG.mocks.PROD.getChaptersDescription);
      } else {
        responsePromise = handleReq($window.ChargeCodeHomeController.getChaptersDescription);
      }

      self._cache.put(cacheKey, responsePromise);
      return responsePromise;
    },

    getMaximaBenefit: function() {

      var cacheKey = 'getMaximaBenefit';
      var cachedResponsePromise = self._cache.get(cacheKey);

      if (angular.isObject(cachedResponsePromise)) {
        return cachedResponsePromise;
      }

      var responsePromise;
      if (APP_CONFIG.SF_ORG.IsSandbox && angular.isString(APP_CONFIG.mocks.PROD.getMaximaBenefit)) {
        responsePromise = getMockResponse(APP_CONFIG.mocks.PROD.getMaximaBenefit);
      } else {
        responsePromise = handleReq($window.ChargeCodeHomeController.getMaximaBenefit);
      }

      self._cache.put(cacheKey, responsePromise);
      return responsePromise;
    },

    getScheduleChapterCList: function() {

      var cacheKey = 'getScheduleChapterCList';
      var cachedResponsePromise = self._cache.get(cacheKey);

      if (angular.isObject(cachedResponsePromise)) {
        return cachedResponsePromise;
      }

      var responsePromise = handleReq($window.ChargeCodeHomeController.getScheduleChapterCList);
      self._cache.put(cacheKey, responsePromise);
      return responsePromise;
    },

    getDiagnosticAttachmentWrapperList: function() {

      var cacheKey = 'getDiagnosticAttachmentWrapperList';
      var cachedResponsePromise = self._cache.get(cacheKey);

      if (angular.isObject(cachedResponsePromise)) {
        return cachedResponsePromise;
      }

      var responsePromise = handleReq($window.ChargeCodeHomeController.getDiagnosticAttachmentWrapperList);
      self._cache.put(cacheKey, responsePromise);
      return responsePromise.then(preProcessScheduleAttachmentWrapperList);
    },

    getProcedureAttachmentWrapperList: function() {

      var cacheKey = 'getProcedureAttachmentWrapperList';
      var cachedResponsePromise = self._cache.get(cacheKey);

      if (angular.isObject(cachedResponsePromise)) {
        return cachedResponsePromise;
      }

      var responsePromise;
      if (APP_CONFIG.SF_ORG.IsSandbox && angular.isString(APP_CONFIG.mocks.PROD.getProcedureAttachmentWrapperList)) {
        responsePromise = getMockResponse(APP_CONFIG.mocks.PROD.getProcedureAttachmentWrapperList);
      } else {
        responsePromise = handleReq($window.ChargeCodeHomeController.getProcedureAttachmentWrapperList);
      }

      self._cache.put(cacheKey, responsePromise);

      return responsePromise.then(preProcessScheduleAttachmentWrapperList);
    },

    getUsefulLinksList: function() {

      var cacheKey = 'getUsefulLinksList';
      var cachedResponsePromise = self._cache.get(cacheKey);

      if (angular.isObject(cachedResponsePromise)) {
        return cachedResponsePromise;
      }

      var responsePromise = handleReq($window.ChargeCodeHomeController.getUsefulLinksList);
      self._cache.put(cacheKey, responsePromise);
      return responsePromise;
    },

    getChargeCodeSiteHelpTextCMap: function() {

      var cacheKey = 'getChargeCodeSiteHelpTextCMap';
      var cachedResponsePromise = self._cache.get(cacheKey);

      if (angular.isObject(cachedResponsePromise)) {
        return cachedResponsePromise;
      }

      var responsePromise = handleReq($window.ChargeCodeHomeController.getChargeCodeSiteHelpTextCMap);
      self._cache.put(cacheKey, responsePromise);
      return responsePromise;
    },

    getChargeCodeSiteHelpTextDiagnosticCMap: function() {
      var cacheKey = 'getChargeCodeSiteHelpTextDiagnosticCMap';
      var cachedResponsePromise = self._cache.get(cacheKey);

      if (angular.isObject(cachedResponsePromise)) {
        return cachedResponsePromise;
      }

      var responsePromise = handleReq($window.ChargeCodeHomeController.getChargeCodeSiteHelpTextDiagnosticCMap);
      self._cache.put(cacheKey, responsePromise);
      return responsePromise;
    }
  };

  this._executeMethodByNameAsync = function(methodNameToPreExecute) {

    var methodToPreExecute = service[methodNameToPreExecute];

    if (angular.isFunction(methodToPreExecute)) {
      $timeout(methodToPreExecute, 0);
    } else {
      $log.warn('APP_CONFIG defined a method to pre execute that does not exist: ', methodNameToPreExecute);
    }
  };

  this._preFetchIfConfigured = function() {

    if (APP_CONFIG.backEndPreFetch) {
      angular.forEach(APP_CONFIG.backEndPreFetch, self._executeMethodByNameAsync);
    }
  };

  this.init();

  return service;

}).run(function(SFDC, APP_CONFIG, $window) {
  'use strict';

  if (APP_CONFIG.debugInfoEnabled) {
    $window.sfdcFactory = SFDC;
  }

  // This run block is also here to eagerly load the SFDC factory, which will kick in the pre fetching.
});

angular.module('config', []).constant('APP_CONFIG', angular.extend({
  name: 'Bupa Code Search Tool',
  debugInfoEnabled: window.$SFDCServerSideRenderedConfig.SF_ORG.IsSandbox,
  debugLogEnabled: window.$SFDCServerSideRenderedConfig.SF_ORG.IsSandbox,
  minimumDelayInMsBetweenCodeSearch: 50, // default value, might get overridden by the server side rendered config from index.html
  minimumSearchTermLength: 3,
  backEndPreFetch:  [
    'getChargeCodeSiteHelpText',
    'getUnbundling',
    'getChargeCodeSchedule',
    'getChargeCode',
    'getChaptersDescription',
    'getUsefulLinksList',
    'getProcedureAttachmentWrapperList',
    'getChargeCodeScheduleDiagnostic',
    'getChargeCodeDiagnostic',
    'getUnbundlingDiagnostic',
    'getChaptersDescriptionDiagnostic',
    'getChargeCodeSiteHelpTextDiagnosticCMap'
  ],

  states: {
    HOME: {
      name: 'home',
      url: '/home',
      urlWithHash: '/#/home'
    },
    PROCEDURES: {
      name: 'procedures',
      url: '/procedures',
      urlWithHash: '/#/procedures'
    },
    DIAGNOSTICS: {
      name: 'diagnostic_tests',
      url: '/diagnostic_tests',
      urlWithHash: '/#/diagnostic_tests'
    },
    DRUGS: {
      name: 'drugs',
      url: '/drugs',
      urlWithHash: '/#/drugs'
    },
    CONTACT_US: {
      name: 'contact_us',
      url: '/contact_us',
      urlWithHash: '/#/contact_us'
    }
  },
  mocks: {
    PROD: {
      getProcedureAttachmentWrapperList : window.$SFDCServerSideRenderedConfig.resourceBaseUrl.concat('/statics/PROD/getProcedureAttachmentWrapperList.json'),
      getChargeCode: window.$SFDCServerSideRenderedConfig.resourceBaseUrl.concat('/statics/PROD/getChargeCode.json'),
      getChargeCodeSchedule: window.$SFDCServerSideRenderedConfig.resourceBaseUrl.concat('/statics/PROD/getChargeCodeSchedule.json'),
      getUnbundling: window.$SFDCServerSideRenderedConfig.resourceBaseUrl.concat('/statics/PROD/getUnbundling.json'),
      getChaptersDescription: window.$SFDCServerSideRenderedConfig.resourceBaseUrl.concat('/statics/PROD/getChaptersDescription.json'),
      getMaximaBenefit: window.$SFDCServerSideRenderedConfig.resourceBaseUrl.concat('/statics/PROD/getMaximaBenefit.json'),
      getChargeCodeSiteHelpText: window.$SFDCServerSideRenderedConfig.resourceBaseUrl.concat('/statics/PROD/getChargeCodeSiteHelpText.json')
    }
  }
}, window.$SFDCServerSideRenderedConfig))

  .config(function (APP_CONFIG, $logProvider, $compileProvider) {
    'use strict';

    $compileProvider.debugInfoEnabled(APP_CONFIG.debugInfoEnabled);
    $logProvider.debugEnabled(APP_CONFIG.debugLogEnabled);
  })

  .run(function (APP_CONFIG, $log) {
    'use strict';
    $log.debug('APP_CONFIG.debugInfoEnabled: ', APP_CONFIG.debugInfoEnabled);
    $log.debug('APP_CONFIG.debugLogEnabled: ', APP_CONFIG.debugLogEnabled);
  });

angular.module('bupa.common', [
  'ngSanitize',
  'bupa.common.browserversion',
  'bupa.common.translations',
  'bupa.common.navbar',
  'bupa.common.footer'
]);

angular.module('bupa.common').filter('bpSceTrustAsHtml', function ($sce) {
  'use strict';
  return $sce.trustAsHtml;
});

angular.module('bupa.common').directive('dynamic', function ($compile) {
  'use strict';

  return {
    restrict: 'A',
    replace: true,
    scope: {
      dynamic: '&'
    },
    link: function (scope, ele) {
      ele.html(scope.dynamic());
      $compile(ele.contents())(scope);
    }
  };
});

angular.module('bupa.common.browserversion', []).service('bpBrowserVersion', function ($window) {
  'use strict';

  this.checkBrowserVersion = function () {
    $window.jQuery.noConflict();

    $window.jQuery(document).ready(function () {
      $window.jQuery('#browserMessage').hide();
      browserDetection();
    });

    function browserDetection() {
      var browserName = '';
      var browserVersion = 0;

      if ($window.bowser.name === 'Internet Explorer') {
        browserName = 'IE';
        browserVersion = parseInt($window.bowser.version);
      } else if ($window.bowser.name === 'Firefox') {
        browserName = $window.bowser.name;
        browserVersion = parseInt($window.bowser.version);
      } else if ($window.bowser.name === 'Opera') {
        browserName = $window.bowser.name;
      }

      //alert(browserName+''+browserVersion);
      if ((browserName === 'IE' && browserVersion <= 7) ||
        (browserName === 'Firefox' && browserVersion < 4) ||
        (browserName === 'Opera')) {
        $window.jQuery('#browserMessage').show(); // FIXME proper modal dialog should be here
      }
    }
  };
});

angular.module('bupa', [
  'config',
  'bupa.core',
  'ui.router'

]).config(function($locationProvider){
  'use strict';

  $locationProvider.html5Mode(true);

}).run(function ($log, APP_CONFIG) {
  'use strict';
  $log.debug('Running application: ' + APP_CONFIG.name);
});




(function(module) {
try {
  module = angular.module('bupa-templates');
} catch (e) {
  module = angular.module('bupa-templates', []);
}
module.run(['$templateCache', function($templateCache) {
  $templateCache.put('/bupa/core/Appendices.html',
    '<div class="modal-header" style="text-align:left"><button type="button" class="close" ng-click="$hide()">&times;</button><h2 class="modal-title">Appendices</h2></div><div class="modal-body" style="padding:20px;text-align:left;font-family: Arial,Helvetica,Sans-Serif !important"><apex:repeat value="{!additionalInformation}" var="info"><apex:outputtext rendered="{!info.Type__c == \'Appendix\'}"><h3>{!info.Chapter_Name__c}</h3><p>{!info.Chapter_Information__c}</p><br/><br/></apex:outputtext></apex:repeat></div><div class="modal-footer"><button type="button" class="btn btn-default" ng-click="$hide()" style="float:right">Close</button></div>');
}]);
})();

(function(module) {
try {
  module = angular.module('bupa-templates');
} catch (e) {
  module = angular.module('bupa-templates', []);
}
module.run(['$templateCache', function($templateCache) {
  $templateCache.put('/bupa/common/footer/Footer.html',
    '<div ng-controller="BpFooterCtrl"><div class="bupaFooter"><div class="contact"><h1>{{ \'FooterProvidersTitle\' | translate}}</h1><p style="margin-top:0">{{\'FooterProviderHealthcareTeam\' | translate}}</p><div class="contactOptions"><ul class="contactList clearfix"><li class="call last backgroundUrlPhonePng" style="padding-left:50px"><div class="bupaFooterContactLiHeading">{{\'FooterProviderHealthcareTeamPhone\' | translate}}</div><div class="smaller bupaFooterContactLiDetails">{{\'FooterProviderHealthcareTeamOpeningHoursWeekday\' | translate}}<br/>{{\'FooterProviderHealthcareTeamOpeningHoursWeekend\' | translate}}</div></li></ul></div><h1>{{\'FooterCustomersTitle\' | translate}}</h1><p style="margin-top:0">{{\'FooterCustomerServiceTeam\' | translate}}</p><div class="contactOptions"><ul class="contactList clearfix"><li class="call backgroundUrlPhonePng" style="padding-left:50px"><div class="small">{{\'FooterCustomerServiceTeamPersonal\' | translate}}</div><div class="bupaFooterContactLiHeading">{{\'FooterCustomerServicePersonalTeamPhone\' | translate}}</div><div class="smaller bupaFooterContactLiDetails">{{\'FooterCustomerServicePersonalOpeningHoursWeekday\' | translate}}<br/>{{\'FooterCustomerServicePersonalOpeningHoursWeekend\' | translate}}</div></li><li class="call backgroundUrlPhonePng" style="padding-left:50px"><div class="small">{{\'FooterCustomerServiceTeamCompany\' | translate}}</div><div class="bupaFooterContactLiHeading">{{\'FooterCustomerServiceCompanyTeamPhone\' | translate}}</div><div class="smaller bupaFooterContactLiDetails">{{\'FooterCustomerServiceCompanyOpeningHoursWeekday\' | translate}}<br/>{{\'FooterCustomerServiceCompanyOpeningHoursWeekend\' | translate}}</div></li><li class="call last backgroundUrlPhonePng" style="padding-left:50px"><div class="small">{{\'FooterCustomerServiceTeamCorporate\' | translate}}</div><div class="bupaFooterContactLiHeading">{{\'FooterCustomerServiceCorporateTeamPhone\' | translate}}</div><div class="smaller bupaFooterContactLiDetails">{{\'FooterCustomerServiceCorporateOpeningHoursWeekday\' | translate}}<br/>{{\'FooterCustomerServiceCorporateOpeningHoursWeekend\' | translate}}</div></li></ul><h4 style="font-weight: bold">{{\'FooterCustomerServiceCallRecordingSafeGuard\' | translate}}</h4></div></div></div><div class="disclaimer"><p style="padding-bottom:10px; padding-top:10px">{{\'FooterDisclaimer\' | translate}}</p></div><div class="footnotesLinks clearfix"><ul><li><a rel="new-window" target="_blank" title="{{\'FooterLinkTooltipBupaHomePage\' | translate}}" ng-href="{{\'FooterLinkUrlBupaHomePage\' | translate}}">{{\'FooterLinkLabelBupaHomePage\' | translate}}</a></li><li><a rel="new-window" target="_blank" title="{{\'FooterLinkTooltipBupaAccessibilityPage\' | translate}}" ng-href="{{\'FooterLinkUrlBupaAccessibilityPage\' | translate}}">{{\'FooterLinkLabelBupaAccessibilityPage\' | translate}}</a></li><li><a rel="new-window" target="_blank" title="{{\'FooterLinkTooltipBupaLegalNoticesPage\' | translate}}" ng-href="{{\'FooterLinkUrlBupaLegalNoticesPage\' | translate}}">{{\'FooterLinkLabelBupaLegalNoticesPage\' | translate}}</a></li><li><a rel="new-window" target="_blank" title="{{\'FooterLinkTooltipBupaCopyrightPage\' | translate}}" ng-href="{{\'FooterLinkUrlBupaCopyrightPage\' | translate}}">{{\'FooterLinkLabelBupaCopyrightPage\' | translate}}</a></li></ul></div></div>');
}]);
})();

(function(module) {
try {
  module = angular.module('bupa-templates');
} catch (e) {
  module = angular.module('bupa-templates', []);
}
module.run(['$templateCache', function($templateCache) {
  $templateCache.put('/bupa/common/navbar/NavBar.html',
    '<header role="banner"><div id="bupaContentHeader" ng-controller="NavBarCtrl"><a id="home" href="http://www.bupa.co.uk">Home</a><ul class="nav nav-pills pull-right" id="bupaNav"><li ng-class="{ active: $state.includes(APP_CONFIG.states.HOME.name) }"><a ng-href="{{APP_CONFIG.states.HOME.urlWithHash}}">{{ \'NavBarLinkHome\' | translate }}</a></li><li ng-class="{ active: $state.includes(APP_CONFIG.states.PROCEDURES.name) }"><a ng-href="{{APP_CONFIG.states.PROCEDURES.urlWithHash}}">{{ \'NavBarLinkProcedure\' | translate }}</a></li><li ng-class="{ active: $state.includes(APP_CONFIG.states.DIAGNOSTICS.name) }"><a ng-href="{{APP_CONFIG.states.DIAGNOSTICS.urlWithHash}}">{{ \'NavBarLinkDiagnostic\' | translate }}</a></li><li ng-class="{ active: $state.includes(APP_CONFIG.states.DRUGS.name) }"><a ng-href="{{APP_CONFIG.states.DRUGS.urlWithHash}}">{{ \'NavBarLinkDrugs\' | translate }}</a></li></ul><div style="margin-left: 130px"><h1 class="{{bupaNavBarClasses}}" style="text-transform:none; margin: .67em 0;font-size: 2em; font-weight: bold">{{ titleTextKey | translate }}</h1></div></div></header>');
}]);
})();

(function(module) {
try {
  module = angular.module('bupa-templates');
} catch (e) {
  module = angular.module('bupa-templates', []);
}
module.run(['$templateCache', function($templateCache) {
  $templateCache.put('/bupa/core/appendices/Appendices.html',
    '<div ng-controller="AppendicesCtrl"><div class="modal-header" style="text-align:left"><button type="button" class="close" ng-click="$hide()">&times;</button><h2 class="modal-title">Appendices</h2></div><div cg-busy="fetchPromise" class="modal-body" style="padding:20px;text-align:left;font-family: Arial,Helvetica,Sans-Serif !important"><div ng-repeat="appendix in appendices"><h3 dynamic="appendix.Chapter_Name__c"></h3><p dynamic="appendix.Chapter_Information__c"></p><br/><br/></div></div><div class="modal-footer"><button type="button" class="btn btn-default" ng-click="$hide()" style="float:right">Close</button></div></div>');
}]);
})();

(function(module) {
try {
  module = angular.module('bupa-templates');
} catch (e) {
  module = angular.module('bupa-templates', []);
}
module.run(['$templateCache', function($templateCache) {
  $templateCache.put('/bupa/core/benefit-maxima/BenefitMaxima.html',
    '<div ng-controller="BenefitMaximaCtrl"><div class="modal-header" style="text-align:left"><button type="button" class="close" ng-click="$hide()">&times;</button><h2 class="modal-title">Guide to Bupa benefit maxima</h2><p>The tables below provide details of the maximum reimbursement for surgeons\' and anaesthetists\' fees.</p></div><div cg-busy="fetchPromise" class="modal-body" style="padding:20px;text-align:left"><table class="table"><thead><tr><th>Surgeons</th><th ng-repeat="pos in lengthBenefit">{{pos}}</th></tr></thead><tbody><tr ng-repeat="(name, benefitObj) in maximaBenefits"><td>{{benefitObj[1].Name.split(\' \')[0]}}</td><td ng-repeat="pos in lengthBenefit">£{{benefitObj[pos].Surgeons_Price__c}}</td></tr></tbody></table>Please note that some procedures reflect a lower complexity than Minor 1 and are reimbursed at £50.<table class="table"><thead><tr><th>Anaesthetists</th><th ng-repeat="pos in lengthBenefit">{{pos}}</th></tr></thead><tbody><tr ng-repeat="(name, benefitObj) in maximaBenefits"><td>{{benefitObj[1].Name.split(\' \')[0]}}</td><td ng-repeat="pos in lengthBenefit">£{{benefitObj[pos].Anaesthetists_Price__c}}</td></tr></tbody></table></div><div class="modal-footer"><div style="display:table-row"><div style="text-align:left; display:table-cell;padding-right:20px">If you have any questions please call Bupa Provider Services on 08457 55 33 33. Lines are open 8am to 8pm, Monday to Friday and 8am to 1pm on Saturday. Calls may be recorded and may be monitored.</div><div style="display:table-cell"><button type="button" class="btn btn-default" ng-click="$hide()">Close</button></div></div></div></div>');
}]);
})();

(function(module) {
try {
  module = angular.module('bupa-templates');
} catch (e) {
  module = angular.module('bupa-templates', []);
}
module.run(['$templateCache', function($templateCache) {
  $templateCache.put('/bupa/core/essential-notes/EssentialNotes.html',
    '<div ng-controller="EssentialNotesCtrl"><div class="modal-header" style="text-align:left"><button type="button" class="close" ng-click="$hide()">&times;</button><h2 class="modal-title">Essential Notes to the schedule</h2><p>These Essential Notes should be used in conjunction with the Bupa Schedule of Procedures to explain its content in greater detail.</p></div><div cg-busy="fetchPromise" class="modal-body" style="padding:20px;text-align:left;font-family: Arial,Helvetica,Sans-Serif !important"><div ng-repeat="essentialNote in essentialNotes"><h3 dynamic="essentialNote.Chapter_Name__c"></h3><p dynamic="essentialNote.Chapter_Information__c" class="bpEssentialNoteChapterInformation"></p><br/><br/></div></div><div class="modal-footer"><button type="button" class="btn btn-default" ng-click="$hide()" style="float:right">Close</button></div></div>');
}]);
})();

(function(module) {
try {
  module = angular.module('bupa-templates');
} catch (e) {
  module = angular.module('bupa-templates', []);
}
module.run(['$templateCache', function($templateCache) {
  $templateCache.put('/bupa/core/contact-us/ContactUs.html',
    '<bp-nav-bar title-text-key="\'NavBarLinkContactUs\'"></bp-nav-bar><div id="bupaContent"><form novalidate name="feedbackFormCtrl" ng-submit="onContactUsFormSubmit(feedback, feedbackFormCtrl)" id="theForm"><div class="panel panel-default" id="bupaContainer"><h3>Please complete the following form:</h3><br/><div class="form-horizontal" id="bupaContactForm"><div ng-class="{\'has-error\': feedbackFormCtrl.Title__c.$invalid && (feedbackFormCtrl.Title__c.$touched || feedbackFormCtrl.$submitted),\n' +
    '                        \'has-success\': feedbackFormCtrl.Title__c.$valid && (feedbackFormCtrl.Title__c.$touched || feedbackFormCtrl.$submitted)\n' +
    '                        }" class="form-group has-feedback"><label class="col-sm-2 control-label">Title</label><div class="col-sm-10 col-lg-9"><select ng-model="feedback.websiteContact__C.Title__c" ng-options="title as title for title in [\'Mr.\',\'Mrs.\',\'Ms.\',\'Miss.\',\'Mx.\',\'Dr.\',\'Prof.\']" ng-required="true" name="Title__c" class="form-control"><option value="">-- Select a title --</option></select><span style="right: 25px" ng-if="feedbackFormCtrl.Title__c.$invalid && (feedbackFormCtrl.Title__c.$touched || feedbackFormCtrl.$submitted)" class="form-control-feedback glyphicon glyphicon-remove"></span> <span style="right: 25px" ng-if="feedbackFormCtrl.Title__c.$valid && (feedbackFormCtrl.Title__c.$touched || feedbackFormCtrl.$submitted)" class="form-control-feedback glyphicon glyphicon-ok"></span></div></div><div ng-class="{\'has-error\': feedbackFormCtrl.FirstName__c.$invalid && (feedbackFormCtrl.FirstName__c.$touched || feedbackFormCtrl.$submitted),\n' +
    '                        \'has-success\': feedbackFormCtrl.FirstName__c.$valid && (feedbackFormCtrl.FirstName__c.$touched || feedbackFormCtrl.$submitted)\n' +
    '                        }" class="form-group has-feedback"><label class="col-sm-2 control-label">First name</label><div class="col-sm-10 col-lg-9"><input ng-model="feedback.websiteContact__C.FirstName__c" ng-required="true" name="FirstName__c" class="form-control"/> <span ng-if="feedbackFormCtrl.FirstName__c.$invalid && (feedbackFormCtrl.FirstName__c.$touched || feedbackFormCtrl.$submitted)" class="form-control-feedback glyphicon glyphicon-remove"></span> <span ng-if="feedbackFormCtrl.FirstName__c.$valid && (feedbackFormCtrl.FirstName__c.$touched || feedbackFormCtrl.$submitted)" class="form-control-feedback glyphicon glyphicon-ok"></span></div></div><div ng-class="{\'has-error\': feedbackFormCtrl.Name.$invalid && (feedbackFormCtrl.Name.$touched || feedbackFormCtrl.$submitted),\n' +
    '                        \'has-success\': feedbackFormCtrl.Name.$valid && (feedbackFormCtrl.Name.$touched || feedbackFormCtrl.$submitted)\n' +
    '                        }" class="form-group has-feedback"><label class="col-sm-2 control-label">Last name</label><div class="col-sm-10 col-lg-9"><input ng-model="feedback.websiteContact__C.Name" ng-required="true" name="Name" class="form-control"/> <span ng-if="feedbackFormCtrl.Name.$invalid && (feedbackFormCtrl.Name.$touched || feedbackFormCtrl.$submitted)" class="form-control-feedback glyphicon glyphicon-remove"></span> <span ng-if="feedbackFormCtrl.Name.$valid && (feedbackFormCtrl.Name.$touched || feedbackFormCtrl.$submitted)" class="form-control-feedback glyphicon glyphicon-ok"></span></div></div><div ng-class="{\'has-error\': feedbackFormCtrl.Email__c.$invalid && (feedbackFormCtrl.Email__c.$touched || feedbackFormCtrl.$submitted),\n' +
    '                        \'has-success\': feedbackFormCtrl.Email__c.$valid && (feedbackFormCtrl.Email__c.$touched || feedbackFormCtrl.$submitted)\n' +
    '                        }" class="form-group has-feedback"><label class="col-sm-2 control-label">Email</label><div class="col-sm-10 col-lg-9"><input ng-model="feedback.websiteContact__C.Email__c" ng-required="true" type="email" name="Email__c" class="form-control"/> <span ng-if="feedbackFormCtrl.Email__c.$invalid && (feedbackFormCtrl.Email__c.$touched || feedbackFormCtrl.$submitted)" class="form-control-feedback glyphicon glyphicon-remove"></span> <span ng-if="feedbackFormCtrl.Email__c.$valid && (feedbackFormCtrl.Email__c.$touched || feedbackFormCtrl.$submitted)" class="form-control-feedback glyphicon glyphicon-ok"></span></div></div><div ng-class="{\'has-error\': feedbackFormCtrl.Description__c.$invalid && (feedbackFormCtrl.Description__c.$touched || feedbackFormCtrl.$submitted),\n' +
    '                        \'has-success\': feedbackFormCtrl.Description__c.$valid && (feedbackFormCtrl.Description__c.$touched || feedbackFormCtrl.$submitted)\n' +
    '                        }" class="form-group has-feedback"><label class="col-sm-2 control-label">Comments</label><div class="col-sm-10 col-lg-9"><textarea ng-model="feedback.websiteRequest__C.Description__c" ng-required="true" name="Description__c" class="form-control" rows="5">\n' +
    '            </textarea><span ng-if="feedbackFormCtrl.Description__c.$invalid && (feedbackFormCtrl.Description__c.$touched || feedbackFormCtrl.$submitted)" class="form-control-feedback glyphicon glyphicon-remove"></span> <span ng-if="feedbackFormCtrl.Description__c.$valid && (feedbackFormCtrl.Description__c.$touched || feedbackFormCtrl.$submitted)" class="form-control-feedback glyphicon glyphicon-ok"></span></div></div><div class="form-group"><div class="col-sm-offset-2 col-sm-2"><button type="submit" class="btn btn-default">Submit</button></div><div class="col-sm-6 col-lg-7"><div ng-if="feedbackFormCtrl.$submitted && feedbackFormCtrl.$invalid" class="alert alert-danger">There are some errors in the data you\'ve entered. Please correct the fields marked as invalid and try submitting the form again.</div><div ng-if="requestSucceded === false && feedbackFormCtrl.$submitted && feedbackFormCtrl.$valid" class="alert alert-danger"><i class="glyphicon glyphicon-exclamation-sign"></i> We could not process your request, due to a technical error. Please try refreshing the page.</div><div ng-if="requestSucceded === true && feedbackFormCtrl.$submitted && feedbackFormCtrl.$valid" class="alert alert-success">Thank you! Your submission was successful.</div></div></div></div></div></form><div ng-include="\'/bupa/common/footer/Footer.html\'" role="banner"></div></div>');
}]);
})();

(function(module) {
try {
  module = angular.module('bupa-templates');
} catch (e) {
  module = angular.module('bupa-templates', []);
}
module.run(['$templateCache', function($templateCache) {
  $templateCache.put('/bupa/core/diagnostics/Diagnostics.html',
    '<style>.loadingDivClass {\n' +
    '    position: absolute;\n' +
    '    top: 0;\n' +
    '    background-color: grey;\n' +
    '    width: 100%;\n' +
    '    height: 1200px;\n' +
    '    opacity: 0.6;\n' +
    '  }\n' +
    '\n' +
    '  .loadingImg {\n' +
    '    position: absolute;\n' +
    '    top: 200px;\n' +
    '    left: 48%;\n' +
    '  }\n' +
    '\n' +
    '  .loadingText {\n' +
    '    color: #FFF;\n' +
    '    font-size: 18px;\n' +
    '    position: relative;\n' +
    '    top: 50px;\n' +
    '  }\n' +
    '\n' +
    '  #bupaNav a {\n' +
    '    color: black;\n' +
    '  }\n' +
    '\n' +
    '  #bupaNav .active a {\n' +
    '    color: #428bca;\n' +
    '    font-weight: bold;\n' +
    '    background-color: transparent;\n' +
    '  }\n' +
    '\n' +
    '  #bupaNav .active a:hover {\n' +
    '    text-decoration: none !important;\n' +
    '    cursor: default !important;\n' +
    '  }\n' +
    '\n' +
    '  #bupaNav a:hover {\n' +
    '    background-color: transparent;\n' +
    '    color: #428bca;\n' +
    '  }\n' +
    '\n' +
    '  .mainheadeSection {\n' +
    '    background: #6c6e71;\n' +
    '    padding: 10px;\n' +
    '    position: relative;\n' +
    '    margin: 20px 0 10px 0;\n' +
    '    display: block;\n' +
    '\n' +
    '  }\n' +
    '\n' +
    '  .mainheadeSection h1 {\n' +
    '    font-size: 1.6em;\n' +
    '    font-weight: normal;\n' +
    '    margin-top: 5px;\n' +
    '    margin-bottom: 10px;\n' +
    '    padding-bottom: 5px;\n' +
    '    color: #fff;\n' +
    '\n' +
    '  }\n' +
    '\n' +
    '  .mainheadeSectionAction {\n' +
    '    background: #fff;\n' +
    '    padding: 10px;\n' +
    '    display: block;\n' +
    '  }</style><bp-nav-bar title-text-key="\'DiagnosticHeaderTitle\'"></bp-nav-bar><div id="bupaContent"><div class="mainheadeSection"><h1>Diagnostic tests code search tool</h1><div class="mainheadeSectionAction"><div class="patientDetails" id="divInvoiceDetails"><div><p class="text">Start typing in the search box or browse by chapter to find your desired code.</p></div><br/><table><tr><td style="width:40%"><label ng-show="!isChapterShow">Search by diagnostic tests code or by keyword eg blood</label><input id="searchBoxProcedure" class="form-control" name="searchBoxProcedure" ng-model="filter" style="width: 40%" ng-show="!isChapterShow" value=""/><br/><label>Search by chapter</label><select ng-model="chapterNumber" ng-change="showChapter(chapterNumber);" ng-options="chapter.number as chapter.val for chapter in allChapters | orderBy: sortChapters"></select><br/><p style="font-size: 16px; font-weight: bold; padding-top: 50px" ng-hide="isChapterShow||hideOnInit">We have found {{tableParams.total()}} results for \'{{filter}}\'</p><div ng-show="isChapterShow" style="font-weight:bold;font-style:italic"><button class="whiteCta" style="text-underline:none;font-style:normal" ng-click="clearSelection();">Clear Selection</button></div><br/><br/><h2 ng-show="isChapterShow" style="padding-top:40px">{{currentChapter}}</h2><p ng-show="isChapterShow" ng-bind-html="allChaptersDescription[currentChapter]"/></td></tr></table><table ng-table="tableParams" class="table" ng-hide="hideOnInit"><thead><tr><th>{{ \'ChargeCodeCFieldsNameLabel\' | translate }} <a tooltip="{{chargeCodeSiteHelpTextCMap[\'Name\'].HelpText__c}}"><i class="glyphicon glyphicon-question-sign"></i></a></th><th>{{ \'ChargeCodeCFieldsDescriptionCLabel\' | translate }} <a tooltip="{{chargeCodeSiteHelpTextCMap[\'Description__c\'].HelpText__c}}"><i class="glyphicon glyphicon-question-sign"></i></a></th><th>{{ \'ChargeCodeCFieldsSpecimenTypeCLabel\' | translate }} <a tooltip="{{chargeCodeSiteHelpTextCMap[\'Specimen_type__c\'].HelpText__c}}"><i class="glyphicon glyphicon-question-sign"></i></a></th><th>{{ \'ChargeCodeScheduleCFieldsSectionNameCLabel\' | translate }} <a tooltip="{{chargeCodeSiteHelpTextCMap[\'Section_Name__c\'].HelpText__c}}"><i class="glyphicon glyphicon-question-sign"></i></a></th><th ng-if="chargeCodeSiteHelpTextCMap[\'OPDT_code__c\'].HelpText__c">{{ \'OpdtPricesDiagnosticTestsTableHeader\' | translate}} <a tooltip="{{chargeCodeSiteHelpTextCMap[\'OPDT_Pricing\'].HelpText__c}}" tooltip-append-to-body="true"><i class="glyphicon glyphicon-question-sign"></i></a></th><th>Unbundling <a tooltip="{{chargeCodeSiteHelpTextCMap[\'Unbundlings\'].HelpText__c}}" tooltip-append-to-body="true"><i class="glyphicon glyphicon-question-sign"></i></a></th></tr></thead><tbody bindonce="group" ng-repeat="group in $groups"><tr class="ng-table-group" bo-if="isChapterShow"><td colspan="10"><a ng-click="group.$hideRows = !group.$hideRows" ng-init="group.$hideRows=true"><span class="glyphicon" ng-class="{ \'glyphicon-chevron-right\': group.$hideRows, \'glyphicon-chevron-down\': !group.$hideRows }"></span> <strong><span bo-text="group.value"></span></strong></a></td></tr><tr ng-hide="group.$hideRows" ng-repeat="codeCharge in group.data" class="animate-showTD" bo-class="{\n' +
    '                                    \'oldPublishedCode\': codeCharge.Published_Code__c&& codeCharge.Publish_Date__c<_6MonthsAgo,\n' +
    '                                    \'soonPublishedCode\': !codeCharge.Published_Code__c&& codeCharge.Publish_Date__c>=_2MonthsAgo,\n' +
    '                                    \'unpublished\': !codeCharge.Published_Code__c&& codeCharge.Unpublish_Date__c>=_2MonthsAgo\n' +
    '                                }"><td><span bo-text="codeCharge.Name"></span><br/><a bo-if="codeCharge.Footnote_i__c" tooltip="{{chargeCodeSiteHelpTextCMap[\'Footnote_i__c\'].HelpText__c}}"><span bo-text="codeCharge.Footnote_i__c"></span></a> <a bo-if="codeCharge.Footnote_ii__c" tooltip="{{chargeCodeSiteHelpTextCMap[\'Footnote_ii__c\'].HelpText__c}}"><span bo-text="codeCharge.Footnote_ii__c"></span></a> <a bo-if="chargeCodeSiteHelpTextCMap[\'Footnote_Asterik__c\'].HelpText__c" tooltip="{{chargeCodeSiteHelpTextCMap[\'Footnote_Asterik__c\'].HelpText__c}}"><span bo-text="codeCharge.Footnote_asterisk_read_only_for_SOP__c"></span></a> <a bo-if="chargeCodeSiteHelpTextCMap[\'Footnote_R__c\'].HelpText__c" tooltip="{{chargeCodeSiteHelpTextCMap[\'Footnote_R__c\'].HelpText__c}}"><span bo-text="codeCharge.Footnote_R__c"></span></a> <a bo-if="chargeCodeSiteHelpTextCMap[\'Footnote_X__c\'].HelpText__c" tooltip="{{chargeCodeSiteHelpTextCMap[\'Footnote_X__c\'].HelpText__c}}"><span bo-text="codeCharge.Footnote_X__c"></span></a> <a bo-if="chargeCodeSiteHelpTextCMap[\'OPDT_code__c\'].HelpText__c" tooltip="{{chargeCodeSiteHelpTextCMap[\'OPDT_code__c\'].HelpText__c}}"><span bo-text="codeCharge.OPDT_code__c"></span></a></td><td bo-if="!codeCharge.isSubSection"><span bo-text="codeCharge.Description__c"></span></td><td bo-if="!codeCharge.isSubSection"><span bo-text="codeCharge.Specimen_type__c"></span></td><td bo-if="!codeCharge.isSubSection" dynamic="codeCharge.chapters"></td><td bo-if="chargeCodeSiteHelpTextCMap[\'OPDT_code__c\'].HelpText__c"><a bo-if="codeCharge.OPDT_code__c === \'OPDT\'" data-content-template="/bupa/core/opdt-pricing/OpdtPricing.html" bs-modal="{{ {chargeCode: codeCharge} }}"><i class="glyphicon glyphicon-chevron-right"></i> View</a> <span bo-if="codeCharge.OPDT_code__c !== \'OPDT\'">-</span></td><td bo-if="!codeCharge.isSubSection"><a bo-if="allUnbundling[codeCharge.Id].length > 0" data-content-template="/bupa/core/unbundling/Unbundling.html" bs-modal="showUnbundling(codeCharge)" ng-click="getUnbundlingCode(codeCharge)"><span class="glyphicon" ng-class="{ \'glyphicon-chevron-right\': !showSubSection[codeCharge.index], \'glyphicon-chevron-down\': showSubSection[codeCharge.index] }"></span> View</a></td></tr></tbody></table><p ng-show="isChapterShow||!hideOnInit"><strong>Page:</strong> {{ tableParams.page() }}</p></div></div></div><bp-useful-documents hide-appendices="true" hide-benefit-maxima="true" attachment-wrappers="diagnosticAttachments"></bp-useful-documents><bp-useful-links></bp-useful-links><div ng-include="\'/bupa/common/footer/Footer.html\'" role="banner"></div></div>');
}]);
})();

(function(module) {
try {
  module = angular.module('bupa-templates');
} catch (e) {
  module = angular.module('bupa-templates', []);
}
module.run(['$templateCache', function($templateCache) {
  $templateCache.put('/bupa/core/home/Home.html',
    '<bp-nav-bar bupa-nav-bar-classes="bupaHeaderHomePage" title-text-key="\'HomeHeaderTitle\'"></bp-nav-bar><br/><br/><div id="bupaContent"><div class="alert alert-info" id="browserMessage" style="display:none"><strong>Browser Warning:</strong> <span ng-bind-html="\'HomeBrowserWarning\' | translate | bpSceTrustAsHtml"></span></div><div><table id="bupaSelection"><tr><td class="bpHomeSelectionTd"><div><h2 ng-bind-html="\'HomeSelectLabelProcedure\' | translate | bpSceTrustAsHtml"></h2><p ng-bind-html="\'HomeDescriptionProcedure\' | translate | bpSceTrustAsHtml"></p></div></td><td class="bpHomeSelectionTd" style="border-left: 1px solid #d0cece"><div><h2 ng-bind-html="\'HomeSelectLabelDiagnostic\' | translate | bpSceTrustAsHtml"></h2><p ng-bind-html="\'HomeDescriptionDiagnostic\' | translate | bpSceTrustAsHtml"></p></div></td></tr><tr><td class="bpHomeSelectionTd"><a id="bupabtn" ng-href="{{ APP_CONFIG.states.PROCEDURES.urlWithHash }}">{{ \'HomeGoToSearch\' | translate }}</a></td><td class="bpHomeSelectionTd" style="border-left: 1px solid #d0cece"><a id="bupabtn" ng-href="{{ APP_CONFIG.states.DIAGNOSTICS.urlWithHash }}">{{ \'HomeGoToSearch\' | translate }}</a></td></tr><tr class="break-column"><td></td></tr><tr><td class="bpHomeSelectionTd"><div><h2 ng-bind-html="\'HomeSelectLabelDrugs\' | translate | bpSceTrustAsHtml"></h2><p ng-bind-html="\'HomeDescriptionDrugs\' | translate | bpSceTrustAsHtml"></p></div></td></tr><tr><td class="bpHomeSelectionTd"><a id="bupabtn" ng-href="{{ APP_CONFIG.states.DRUGS.urlWithHash }}">{{ \'HomeGoToSearch\' | translate }}</a></td></tr></table></div><br/><div class="bupaFooter"><div class="descBox"><p ng-bind-html="\'HomeCCSDMessage\' | translate | bpSceTrustAsHtml" class="bupaDescBoxFirstParagraph"></p></div></div><br/><div ng-include="\'/bupa/common/footer/Footer.html\'" role="banner"></div></div>');
}]);
})();

(function(module) {
try {
  module = angular.module('bupa-templates');
} catch (e) {
  module = angular.module('bupa-templates', []);
}
module.run(['$templateCache', function($templateCache) {
  $templateCache.put('/bupa/core/drugs/Drugs.html',
    '<style>.loadingDivClass {\n' +
    '    position: absolute;\n' +
    '    top: 0;\n' +
    '    background-color: grey;\n' +
    '    width: 100%;\n' +
    '    height: 1200px;\n' +
    '    opacity: 0.6;\n' +
    '  }\n' +
    '\n' +
    '  .loadingImg {\n' +
    '    position: absolute;\n' +
    '    top: 200px;\n' +
    '    left: 48%;\n' +
    '  }\n' +
    '\n' +
    '  .loadingText {\n' +
    '    color: #FFF;\n' +
    '    font-size: 18px;\n' +
    '    position: relative;\n' +
    '    top: 50px;\n' +
    '  }\n' +
    '\n' +
    '  #bupaNav a {\n' +
    '    color: black;\n' +
    '  }\n' +
    '\n' +
    '  #bupaNav .active a {\n' +
    '    color: #428bca;\n' +
    '    font-weight: bold;\n' +
    '    background-color: transparent;\n' +
    '  }\n' +
    '\n' +
    '  #bupaNav .active a:hover {\n' +
    '    text-decoration: none !important;\n' +
    '    cursor: default !important;\n' +
    '  }\n' +
    '\n' +
    '  #bupaNav a:hover {\n' +
    '    background-color: transparent;\n' +
    '    color: #428bca;\n' +
    '  }\n' +
    '\n' +
    '  .mainheadeSection {\n' +
    '    background: #6c6e71;\n' +
    '    padding: 10px;\n' +
    '    position: relative;\n' +
    '    margin: 20px 0 10px 0;\n' +
    '    display: block;\n' +
    '\n' +
    '  }\n' +
    '\n' +
    '  .mainheadeSection h1 {\n' +
    '    font-size: 1.6em;\n' +
    '    font-weight: normal;\n' +
    '    margin-top: 5px;\n' +
    '    margin-bottom: 10px;\n' +
    '    padding-bottom: 5px;\n' +
    '    color: #fff;\n' +
    '\n' +
    '  }\n' +
    '\n' +
    '  .mainheadeSectionAction {\n' +
    '    background: #fff;\n' +
    '    padding: 10px;\n' +
    '    display: block;\n' +
    '  }</style><bp-nav-bar title-text-key="\'DrugsHeaderTitle\'"></bp-nav-bar><div id="bupaContent"><div class="mainheadeSection"><h1>Drug code schedules search tool</h1><div class="mainheadeSectionAction"><div class="patientDetails" id="divInvoiceDetails"><div><p class="text">Start typing in the search box or browse by chapter to find your desired code.</p></div><br/><table><tr><td style="width:40%"><label ng-show="!isChapterShow">Search by drug code or by keyword</label><input id="searchBoxProcedure" class="form-control" name="searchBoxProcedure" ng-model="filter" style="width: 40%" ng-show="!isChapterShow" value=""/><br/><label>Search by chapter</label><select ng-model="chapterNumber" ng-change="showChapter(chapterNumber);" ng-options="chapter.number as chapter.val for chapter in allChapters | orderBy: sortChapters"></select><br/><p style="font-size: 16px; font-weight: bold; padding-top: 50px" ng-hide="isChapterShow||hideOnInit">We have found {{tableParams.total()}} results for \'{{filter}}\'</p><div ng-show="isChapterShow" style="font-weight:bold;font-style:italic"><button class="whiteCta" style="text-underline:none;font-style:normal" ng-click="clearSelection();">Clear Selection</button></div><br/><br/><h2 ng-show="isChapterShow" style="padding-top:40px">{{currentChapter}}</h2><p ng-show="isChapterShow" ng-bind-html="allChaptersDescription[currentChapter]"/></td></tr></table><table ng-table="tableParams" class="table" ng-hide="hideOnInit"><thead><tr><th>{{ \'ChargeCodeCFieldsNameLabel\' | translate }} <a tooltip="{{chargeCodeSiteHelpTextCMap[\'Name\'].HelpText__c}}"><i class="glyphicon glyphicon-question-sign"></i></a></th><th>{{ \'ChargeCodeCFieldsDescriptionCLabel\' | translate }} <a tooltip="{{chargeCodeSiteHelpTextCMap[\'Description__c\'].HelpText__c}}"><i class="glyphicon glyphicon-question-sign"></i></a></th><th>{{ \'ChargeCodeScheduleCFieldsSectionNameCLabel\' | translate }} <a tooltip="{{chargeCodeSiteHelpTextCMap[\'Section_Name__c\'].HelpText__c}}"><i class="glyphicon glyphicon-question-sign"></i></a></th><th>{{ \'ChargeCodeScheduleCFieldsDrugDoseCLabel\' | translate }} <a tooltip="{{chargeCodeSiteHelpTextCMap[\'Drug_dose__c\'].HelpText__c}}"><i class="glyphicon glyphicon-question-sign"></i></a></th><th>{{ \'ChargeCodeScheduleCFieldsCancerOnlyCLabel\' | translate }} <a tooltip="{{chargeCodeSiteHelpTextCMap[\'Cancer_Only__c\'].HelpText__c}}"><i class="glyphicon glyphicon-question-sign"></i></a></th><th>{{ \'ChargeCodeScheduleCFieldsPreAuthorizationCLabel\' | translate }} <a tooltip="{{chargeCodeSiteHelpTextCMap[\'Pre_Authorisation_required_Drugs__c\'].HelpText__c}}"><i class="glyphicon glyphicon-question-sign"></i></a></th></tr></thead><tbody bindonce="group" ng-repeat="group in $groups"><tr class="ng-table-group" bo-if="isChapterShow"><td colspan="10"><a ng-click="group.$hideRows = !group.$hideRows" ng-init="group.$hideRows=true"><span class="glyphicon" ng-class="{ \'glyphicon-chevron-right\': group.$hideRows, \'glyphicon-chevron-down\': !group.$hideRows }"></span> <strong><span bo-text="group.value"></span></strong></a></td></tr><tr ng-hide="group.$hideRows" ng-repeat="codeCharge in group.data" class="animate-showTD" bo-class="{\n' +
    '                                    \'oldPublishedCode\': codeCharge.Published_Code__c&& codeCharge.Publish_Date__c<_6MonthsAgo,\n' +
    '                                    \'soonPublishedCode\': !codeCharge.Published_Code__c&& codeCharge.Publish_Date__c>=_2MonthsAgo,\n' +
    '                                    \'unpublished\': !codeCharge.Published_Code__c&& codeCharge.Unpublish_Date__c>=_2MonthsAgo\n' +
    '                                }"><td><span bo-text="codeCharge.Name"></span><br/><a bo-if="codeCharge.Footnote_i__c" tooltip="{{chargeCodeSiteHelpTextCMap[\'Footnote_i__c\'].HelpText__c}}"><span bo-text="codeCharge.Footnote_i__c"></span></a> <a bo-if="codeCharge.Footnote_ii__c" tooltip="{{chargeCodeSiteHelpTextCMap[\'Footnote_ii__c\'].HelpText__c}}"><span bo-text="codeCharge.Footnote_ii__c"></span></a> <a bo-if="chargeCodeSiteHelpTextCMap[\'Footnote_Asterik__c\'].HelpText__c" tooltip="{{chargeCodeSiteHelpTextCMap[\'Footnote_Asterik__c\'].HelpText__c}}"><span bo-text="codeCharge.Footnote_asterisk_read_only_for_SOP__c"></span></a> <a bo-if="chargeCodeSiteHelpTextCMap[\'Footnote_R__c\'].HelpText__c" tooltip="{{chargeCodeSiteHelpTextCMap[\'Footnote_R__c\'].HelpText__c}}"><span bo-text="codeCharge.Footnote_R__c"></span></a> <a bo-if="chargeCodeSiteHelpTextCMap[\'Footnote_X__c\'].HelpText__c" tooltip="{{chargeCodeSiteHelpTextCMap[\'Footnote_X__c\'].HelpText__c}}"><span bo-text="codeCharge.Footnote_X__c"></span></a> <a bo-if="chargeCodeSiteHelpTextCMap[\'OPDT_code__c\'].HelpText__c" tooltip="{{chargeCodeSiteHelpTextCMap[\'OPDT_code__c\'].HelpText__c}}"><span bo-text="codeCharge.OPDT_code__c"></span></a></td><td bo-if="!codeCharge.isSubSection"><span bo-text="codeCharge.Description__c"></span></td><td bo-if="!codeCharge.isSubSection" dynamic="codeCharge.chapters"></td><td bo-if="!codeCharge.isSubSection"><span bo-text="codeCharge.Drug_dose__c"></span></td><td bo-if="!codeCharge.isSubSection"><span bo-if="codeCharge.Cancer_Only__c">Yes</span> <span bo-if="!codeCharge.Cancer_Only__c">No</span></td><td bo-if="!codeCharge.isSubSection"><span bo-text="codeCharge.Pre_Authorisation_required_Drugs__c"></span></td></tr></tbody></table><p ng-show="isChapterShow||!hideOnInit"><strong>Page:</strong> {{ tableParams.page() }}</p></div></div></div><bp-useful-documents hide-appendices="true" hide-benefit-maxima="true" attachment-wrappers="diagnosticAttachments"></bp-useful-documents><bp-useful-links></bp-useful-links><div ng-include="\'/bupa/common/footer/Footer.html\'" role="banner"></div></div>');
}]);
})();

(function(module) {
try {
  module = angular.module('bupa-templates');
} catch (e) {
  module = angular.module('bupa-templates', []);
}
module.run(['$templateCache', function($templateCache) {
  $templateCache.put('/bupa/core/opdt-pricing/OpdtPricing.html',
    '<div class="modal-header" style="text-align:left"><button type="button" class="close" ng-click="$hide()">&times;</button><h2 class="modal-title">{{ \'OpdtPricesModalTitle\' | translate | bpSceTrustAsHtml}}</h2><br/><p ng-bind-html="\'OpdtPricesModalSubTitle\' | translate  | bpSceTrustAsHtml"></p></div><div class="modal-body" style="text-align:left;padding: 0 20px 20px"><h3 style="font-size: 20px">{{\'OpdtPricesModalTableTitle\' | translate}} {{chargeCode.Name}} {{chargeCode.Description__c}}</h3><table class="bpOpdtPricingTable table"><thead><tr><th>{{ \'ChargeCodeCFieldsNameLabel\' | translate}}</th><th>{{ \'ChargeCodeCFieldsDescriptionCLabel\' | translate}}</th><th class="text-center">{{ \'OpdtPricesModalColumnHeaderLondonPrice\' | translate}}</th><th class="text-center">{{ \'OpdtPricesModalColumnHeaderOutsideLondonPrice\' | translate}}</th></tr></thead><tbody><tr><td style="width:60px">{{chargeCode.Name}}</td><td ng-bind-html="chargeCode.Description__c"></td><td ng-bind-html="chargeCode.London_Price_OPDT__c | currency: \'£\'" class="text-center"></td><td ng-bind-html="chargeCode.Outside_London_Price_OPDT__c | currency: \'£\'" class="text-center"></td></tr></tbody></table></div>');
}]);
})();

(function(module) {
try {
  module = angular.module('bupa-templates');
} catch (e) {
  module = angular.module('bupa-templates', []);
}
module.run(['$templateCache', function($templateCache) {
  $templateCache.put('/bupa/core/unbundling/Unbundling.html',
    '<div class="modal-header" style="text-align:left"><button type="button" class="close" ng-click="$hide()">&times;</button><h2 class="modal-title">{{ \'UnbundlingModuleTitle\' | translate }}</h2><p ng-bind-html="\'UnbundlingModuleSubtitle\' | translate  | bpSceTrustAsHtml"></p></div><div class="modal-body" style="padding:20px;text-align:left;padding-top:0px"><h3 style="font-size: 20px">Unacceptable combination(s) for {{unbundlingCode}} {{unbundlingDesc}}</h3><table class="table"><thead><tr><th>Code</th><th>{{ \'ChargeCodeCFieldsDescriptionCLabel\' | translate }}</th><th>{{ \'ChargeCodeCFieldsSurgeonsCategoryCLabel\' | translate }}</th><th>{{ \'ChargeCodeCFieldsAnaesthetistsCategoryCLabel\' | translate }}</th><th>{{ \'ChargeCodeCFieldsHospitalCategoryCLabel\' | translate }}</th><th>{{ \'ChargeCodeCFieldsAnticipatedLOSCLabel\' | translate }}</th><th>{{ \'ChargeCodeCFieldsICLevel2CLabel\' | translate }}</th><th>{{ \'ChargeCodeCFieldsICLevel3CLabel\' | translate }}</th></tr></thead><tbody><tr ng-repeat="item in items"><td>{{item.UnbundlingChargeCode__r.Name}}</td><td>{{item.UnbundlingChargeCode__r.Description__c}}</td><td style="width:100px"><span bo-show="item.Surgeons_Category__c!=\'Cash Value\'"><span bo-text="item.UnbundlingChargeCode__r.Surgeons_Category__c"/><br/></span><br/><span bo-show="item.UnbundlingChargeCode__r.Surgeons_Category__c!=\'-\'">£<span bo-text="item.UnbundlingChargeCode__r.Surgeon_Price__c"/></span></td><td style="width:100px"><span bo-show="item.Anaesthetists_Category__c!=\'Cash Value\'"><span bo-text="item.UnbundlingChargeCode__r.Anaesthetists_Category__c"/><br/></span><br/><span bo-show="item.UnbundlingChargeCode__r.Anaesthetists_Category__c!=\'-\'">£<span bo-text="item.UnbundlingChargeCode__r.Anaesthetist_Price__c"/></span></td><td>{{item.UnbundlingChargeCode__r.Hospital_Category__c}}</td><td><span bo-text="item.UnbundlingChargeCode__r.Anticipated_LOS__c" bo-show="item.UnbundlingChargeCode__r.Anticipated_LOS__c !== \'O/P\' && item.UnbundlingChargeCode__r.Anticipated_LOS__c !== \'D/C\'"/></td><td style="width:60px">{{item.UnbundlingChargeCode__r.IC_Level_2__c}}</td><td style="width:60px">{{item.UnbundlingChargeCode__r.IC_Level_3__c}}</td><td>&nbsp;</td></tr></tbody></table></div>');
}]);
})();

(function(module) {
try {
  module = angular.module('bupa-templates');
} catch (e) {
  module = angular.module('bupa-templates', []);
}
module.run(['$templateCache', function($templateCache) {
  $templateCache.put('/bupa/core/procedures/Procedures.html',
    '<bp-nav-bar title-text-key="\'ProcedureHeaderTitle\'"></bp-nav-bar><style>#bupaNav a {\n' +
    '    color: black;\n' +
    '  }\n' +
    '\n' +
    '  #bupaNav .active a {\n' +
    '    color: #428bca;\n' +
    '    font-weight: bold;\n' +
    '    background-color: transparent;\n' +
    '  }\n' +
    '\n' +
    '  #bupaNav .active a:hover {\n' +
    '    text-decoration: none !important;\n' +
    '    cursor: default !important;\n' +
    '  }\n' +
    '\n' +
    '  #bupaNav a:hover {\n' +
    '    background-color: transparent;\n' +
    '    color: #428bca;\n' +
    '  }\n' +
    '\n' +
    '  .mainheadeSection {\n' +
    '    background: #6c6e71;\n' +
    '    padding: 10px;\n' +
    '    position: relative;\n' +
    '    margin: 20px 0 10px 0;\n' +
    '    display: block;\n' +
    '\n' +
    '  }\n' +
    '\n' +
    '  .mainheadeSection h1 {\n' +
    '    font-size: 1.6em;\n' +
    '    font-weight: normal;\n' +
    '    margin-top: 5px;\n' +
    '    margin-bottom: 10px;\n' +
    '    padding-bottom: 5px;\n' +
    '    color: #fff;\n' +
    '\n' +
    '  }\n' +
    '\n' +
    '  .mainheadeSectionAction {\n' +
    '    background: #fff;\n' +
    '    padding: 10px;\n' +
    '    display: block;\n' +
    '  }\n' +
    '\n' +
    '  .btn-info, .btn-info:hover, .btn-info[disabled], .btn-info[disabled]:hover, #calcButton, #loadingButton {\n' +
    '    background-color: #3071A9;\n' +
    '    border-color: #3071A9;\n' +
    '  }\n' +
    '\n' +
    '  .bold {\n' +
    '    font-weight: bold;\n' +
    '  }</style><style>#bupaNav a {\n' +
    '    color: black;\n' +
    '  }\n' +
    '\n' +
    '  #bupaNav .active a {\n' +
    '    color: #428bca;\n' +
    '    font-weight: bold;\n' +
    '    background-color: transparent;\n' +
    '  }\n' +
    '\n' +
    '  #bupaNav .active a:hover {\n' +
    '    text-decoration: none !important;\n' +
    '    cursor: default !important;\n' +
    '  }\n' +
    '\n' +
    '  #bupaNav a:hover {\n' +
    '    background-color: transparent;\n' +
    '    color: #428bca;\n' +
    '  }\n' +
    '\n' +
    '  #bupaSelection table {\n' +
    '\n' +
    '  }\n' +
    '\n' +
    '  #bupaSelection td {\n' +
    '    width: 50%;\n' +
    '    background-color: white;\n' +
    '  }</style><div id="bupaContent"><div class="mainheadeSection"><h1>Procedure code search tool</h1><div class="mainheadeSectionAction"><table style="border: 1px solid grey"><tr><td ng-bind-html="\'Fee_Checker_HelpText\' | translate | bpSceTrustAsHtml" style="padding-left:15px; padding-top:10px; padding-bottom:10px"></td><td style="padding-top:10px; padding-right: 10px"><button class="btn btn-primary" ng-click="toggleShoppingCart()"><i class="glyphicon glyphicon-shopping-cart"></i> Fee checker <span class="badge ng-binding">{{purchasedCodeCharges.length}}</span></button></td></tr></table><br/><br/><br/><div style="border: 1px solid" class="hidden" id="shoppingCartDiv"><br/><div class="container-fluid"><div class="row"><div class="col-xs-1">I\'m a/an</div><div class="col-xs-4"><select ng-model="defaultService" ng-change="getServiceType(defaultService.ServiceName);" ng-options="service.ServiceName for service in services " required></select></div></div></div><br/><div class="divider"></div><div class="container-fluid"><div class="row"><div class="col-xs-1 bold">Code</div><div class="col-xs-4 bold">Description</div><div class="col-xs-1 bold" style="text-align:center">Fee</div><div class="col-xs-1 bold" style="text-align:center">Adjusted fee</div><div class="col-xs-4 bold">Message</div><div class="col-xs-1"><button ng-click="clearCart(); closeShoppingCart();" class="btn btn-danger btn-xs" style="padding-left:5px; padding-right:5px">Clear</button></div></div></div><div class="divider"></div><div id="showBeforeCalculated" class="container-fluid" ng-show="!Calculated" class="ng-hide"><div class="row" ng-repeat="cc in purchasedCodeCharges track by $index" style="margin-top:5px"><div class="col-xs-1" dynamic="cc.displayedName"></div><div class="col-xs-4">{{cc.Description__c}}&nbsp;</div><div class="col-xs-1" ng-hide="(cc[defaultService.PriceField]==null)" style="text-align:center">{{cc[defaultService.PriceField] | currency: \'£\'}}</div><div class="col-xs-1" ng-hide="!(cc[defaultService.PriceField]==null)" style="text-align:center">{{0 | currency: \'£\'}}</div><div class="col-xs-1" style="text-align:center">{{cc.adjustedPrice | currency: \'£\'}}</div><div class="col-xs-4">{{cc.messageText | bpSceTrustAsHtml}}</div><div class="col-xs-1"><button ng-click="removeItem(cc)" class="btn btn-danger btn-xs"><span class="glyphicon glyphicon-remove"></span></button></div></div></div><div id="showAfterCalculated" class="container-fluid" ng-show="Calculated"><div class="row" ng-repeat="cc in viewResult track by $index" style="margin-top:5px"><div class="col-xs-1" dynamic="cc.code"></div><div class="col-xs-4">{{cc.Description}}&nbsp;</div><div class="col-xs-1" ng-hide="(cc[defaultService.CalculatedPriceField]==null)" style="text-align:center">{{cc[defaultService.CalculatedPriceField] | currency: \'£\'}}</div><div class="col-xs-1" ng-hide="!(cc[defaultService.CalculatedPriceField]==null)" style="text-align:center">{{0 | currency: \'£\'}}</div><div class="col-xs-1" style="text-align:center">{{cc.adjustedPrice | currency: \'£\'}}</div><div class="col-xs-4">{{cc.messageText | bpSceTrustAsHtml}}</div><div class="col-xs-1"><button ng-click="removeCaluclatedItem(cc)" class="btn btn-danger btn-xs"><span class="glyphicon glyphicon-remove"></span></button></div></div></div><br/><div class="divider"></div><div class="container-fluid"><div class="row"><div class="col-xs-1 bold"></div><div class="col-xs-4 bold"></div><div class="col-xs-1 bold" style="text-align:center">Total</div><div class="col-xs-1 bold" style="text-align:center">{{total | currency: \'£\'}}</div><div class="col-xs-4 bold"></div></div></div><br/><div class="divider"></div><div class="container-fluid"><div class="col-xs-5"></div><div class="col-xs-2"><button id="calcButton" ng-hide="loading" class="btn btn-info btn-xs btn-block" ng-click="shoppingCartCalcFull(purchasedCodeCharges)" style="height:26px;font-size: 12px">Calculate Fee</button> <button id="loadingButton" ng-show="loading" class="btn btn-info btn-xs btn-block" style="height:26px;font-size: 12px" disabled>Loading...</button></div></div><br/></div><br/><div class="patientDetails" cg-busy="bpProceduresCtrlFetch" id="divInvoiceDetails"><div><p class="text">Start typing in the search box or browse by chapter to find your desired code.</p></div><br/><table><tr><td style="width:40%"><label ng-show="!isChapterShow">Search by procedure code or by keyword eg knee</label><input id="searchBoxProcedure" class="form-control" name="searchBoxProcedure" ng-model="filter" ng-model-options="{ updateOn: \'default blur\', debounce: {\'default\': APP_CONFIG.minimumDelayInMsBetweenCodeSearch, \'blur\': 0} }" style="width: 40%" ng-show="!isChapterShow" value=""/><br/><label>Search by chapter</label><select ng-model="chapterNumber" ng-change="chapters.showChapter(chapterNumber); closeShoppingCart();" ng-options="chapter.number as chapter.val for chapter in allChapters|orderBy: sortChapters"></select><br/><p style="font-size: 16px; font-weight: bold; padding-top: 50px" ng-hide="isChapterShow||hideOnInit">We have found {{tableParams.total()}} results for \'{{filter}}\'</p><div ng-show="isChapterShow" style="font-weight:bold;font-style:italic"><button class="whiteCta" style="text-underline:none;font-style:normal" ng-click="clearSelection();">Clear Selection</button></div><br/><br/><h2 ng-show="isChapterShow" style="padding-top:40px">{{currentChapter}}</h2><p ng-show="isChapterShow" ng-bind-html="allChaptersDescription[currentChapter]"></p></td></tr></table><table ng-table="tableParams" class="table" ng-hide="hideOnInit"><thead><tr><th>{{ \'ChargeCodeCFieldsNameLabel\' | translate }} <a tooltip="{{chargeCodeSiteHelpTextCMap[\'Name\'].HelpText__c}}"><i class="glyphicon glyphicon-question-sign"></i></a></th><th>{{ \'ChargeCodeCFieldsDescriptionCLabel\' | translate }} <a tooltip="{{chargeCodeSiteHelpTextCMap[\'Description__c\'].HelpText__c}}"><i class="glyphicon glyphicon-question-sign"></i></a></th><th>{{ \'ChargeCodeScheduleCFieldsSectionNameCLabel\' | translate }} <a tooltip="{{chargeCodeSiteHelpTextCMap[\'Section_Name__c\'].HelpText__c}}"><i class="glyphicon glyphicon-question-sign"></i></a></th><th>{{ \'ChargeCodeCFieldsSurgeonsCategoryCLabel\' | translate }} <a tooltip="{{chargeCodeSiteHelpTextCMap[\'Surgeons_Category__c\'].HelpText__c}}"><i class="glyphicon glyphicon-question-sign"></i></a></th><th>{{ \'ChargeCodeCFieldsAnaesthetistsCategoryCLabel\' | translate }} <a tooltip="{{chargeCodeSiteHelpTextCMap[\'Anaesthetists_Category__c\'].HelpText__c}}"><i class="glyphicon glyphicon-question-sign"></i></a></th><th>{{ \'ChargeCodeCFieldsHospitalCategoryCLabel\' | translate }} <a tooltip="{{chargeCodeSiteHelpTextCMap[\'Hospital_Category__c\'].HelpText__c}}"><i class="glyphicon glyphicon-question-sign"></i></a></th><th>{{ \'ChargeCodeCFieldsAnticipatedLOSCLabel\' | translate }} <a tooltip="{{chargeCodeSiteHelpTextCMap[\'Anticipated_LOS__c\'].HelpText__c}}"><i class="glyphicon glyphicon-question-sign"></i></a></th><th>{{ \'ChargeCodeCFieldsICLevel2CLabel\' | translate }} <a tooltip="{{chargeCodeSiteHelpTextCMap[\'IC_Level_2__c\'].HelpText__c}}"><i class="glyphicon glyphicon-question-sign"></i></a></th><th>{{ \'ChargeCodeCFieldsICLevel3CLabel\' | translate }} <a tooltip="{{chargeCodeSiteHelpTextCMap[\'IC_Level_3__c\'].HelpText__c}}"><i class="glyphicon glyphicon-question-sign"></i></a></th><th>Unbundling <a tooltip="{{chargeCodeSiteHelpTextCMap[\'Unbundlings\'].HelpText__c}}"><i class="glyphicon glyphicon-question-sign"></i></a></th><th>Add <a tooltip="{{chargeCodeSiteHelpTextCMap[\'Add\'].HelpText__c}}" tooltip-append-to-body="true"><i class="glyphicon glyphicon-question-sign"></i></a></th></tr></thead><tbody bindonce="group" ng-repeat="group in $groups"><tr class="ng-table-group" bo-if="isChapterShow"><td colspan="10"><a ng-click="group.$hideRows = !group.$hideRows" ng-init="group.$hideRows=true"><span class="glyphicon" ng-class="{ \'glyphicon-chevron-right\': group.$hideRows, \'glyphicon-chevron-down\': !group.$hideRows }"></span> <strong><span bo-text="group.value"/></strong></a></td></tr><tr ng-hide="group.$hideRows" ng-repeat="codeCharge in group.data" class="animate-showTD" bo-class="{\n' +
    '                                    \'oldPublishedCode\': codeCharge.Published_Code__c&& codeCharge.Publish_Date__c<_6MonthsAgo,\n' +
    '                                    \'soonPublishedCode\': !codeCharge.Published_Code__c&& codeCharge.Publish_Date__c>=_2MonthsAgo,\n' +
    '                                    \'unpublished\': !codeCharge.Published_Code__c&& codeCharge.Unpublish_Date__c>=_2MonthsAgo\n' +
    '                                }"><td bo-if="!codeCharge.isSubSection"><span bo-text="codeCharge.Name"></span><br/><a bo-if="codeCharge.Footnote_i__c" tooltip="{{chargeCodeSiteHelpTextCMap[\'Footnote_i__c\'].HelpText__c}}"><span bo-text="codeCharge.Footnote_i__c"></span></a> <a bo-if="codeCharge.Footnote_ii__c" tooltip="{{chargeCodeSiteHelpTextCMap[\'Footnote_ii__c\'].HelpText__c}}"><span bo-text="codeCharge.Footnote_ii__c"></span></a> <a bo-if="chargeCodeSiteHelpTextCMap[\'Footnote_Asterik__c\'].HelpText__c" tooltip="{{chargeCodeSiteHelpTextCMap[\'Footnote_Asterik__c\'].HelpText__c}}"><span bo-text="codeCharge.Footnote_asterisk_read_only_for_SOP__c"></span></a> <a bo-if="chargeCodeSiteHelpTextCMap[\'Footnote_R__c\'].HelpText__c" tooltip="{{chargeCodeSiteHelpTextCMap[\'Footnote_R__c\'].HelpText__c}}"><span bo-text="codeCharge.Footnote_R__c"></span></a> <a bo-if="chargeCodeSiteHelpTextCMap[\'Footnote_X__c\'].HelpText__c" tooltip="{{chargeCodeSiteHelpTextCMap[\'Footnote_X__c\'].HelpText__c}}"><span bo-text="codeCharge.Footnote_X__c"></span></a></td><td bo-if="!codeCharge.isSubSection"><span bo-text="codeCharge.Description__c"></span></td><td bo-if="!codeCharge.isSubSection" dynamic="codeCharge.chapters"></td><td bo-if="!codeCharge.isSubSection"><span bo-show="codeCharge.Surgeons_Category__c!=\'Cash Value\'"><span bo-text="codeCharge.Surgeons_Category__c"></span><br/></span> <span bo-show="codeCharge.Surgeons_Category__c!=\'-\'">£<span bo-text="codeCharge.Surgeon_Price__c"></span></span></td><td bo-if="!codeCharge.isSubSection"><span bo-show="codeCharge.Anaesthetists_Category__c!=\'Cash Value\'"><span bo-text="codeCharge.Anaesthetists_Category__c"></span><br/></span> <span bo-show="codeCharge.Anaesthetists_Category__c!=\'-\'">£<span bo-text="codeCharge.Anaesthetist_Price__c"></span></span></td><td bo-if="!codeCharge.isSubSection"><span bo-text="codeCharge.Hospital_Category__c"></span></td><td bo-if="!codeCharge.isSubSection"><a bo-if="codeCharge.Anticipated_LOS__c === \'D/C\'" tooltip="{{chargeCodeSiteHelpTextCMap[\'D/C\'].HelpText__c}}"><span ng-bind="codeCharge.Anticipated_LOS__c"></span></a> <a bo-if="codeCharge.Anticipated_LOS__c === \'O/P\'" tooltip="{{chargeCodeSiteHelpTextCMap[\'O/P\'].HelpText__c}}"><span ng-bind="codeCharge.Anticipated_LOS__c"></span></a> <span bo-text="codeCharge.Anticipated_LOS__c" bo-show="codeCharge.Anticipated_LOS__c !== \'O/P\' && codeCharge.Anticipated_LOS__c !== \'D/C\'"></span></td><td bo-if="!codeCharge.isSubSection"><span bo-text="codeCharge.IC_Level_2__c"></span></td><td bo-if="!codeCharge.isSubSection"><span bo-text="codeCharge.IC_Level_3__c"></span></td><td bo-if="!codeCharge.isSubSection"><a bo-if="allUnbundling[codeCharge.Id].length > 0" data-content-template="/bupa/core/unbundling/Unbundling.html" bs-modal="showUnbundling(codeCharge)" ng-click="getUnbundlingCode(codeCharge)"><span class="glyphicon" ng-class="{ \'glyphicon-chevron-right\': !showSubSection[codeCharge.index],\n' +
    '                        \'glyphicon-chevron-down\': showSubSection[codeCharge.index] }"></span> View</a></td><td><div ng-click="openShoppingCart();"><a bo-if="(codeCharge.Anaesthetist_Price__c == null && codeCharge.Surgeon_Price__c == null)" tooltip="{{ \'ProcedureToolTip\' | translate }}" tooltip-append-to-body="true"><button class="btn btn-default btn-xs" ng-click="addItem(codeCharge);">+</button></a> <button class="btn btn-default btn-xs" ng-click="addItem(codeCharge);" ng-hide="(codeCharge.Anaesthetist_Price__c == null && codeCharge.Surgeon_Price__c == null)">+</button></div></td></tr></tbody></table><p ng-show="isChapterShow||!hideOnInit"><strong>Page:</strong> {{ tableParams.page() }}</p></div></div></div><bp-useful-documents attachment-wrappers="procedureAttachments"></bp-useful-documents><bp-useful-links></bp-useful-links><div ng-include="\'/bupa/common/footer/Footer.html\'" role="banner"></div></div>');
}]);
})();

(function(module) {
try {
  module = angular.module('bupa-templates');
} catch (e) {
  module = angular.module('bupa-templates', []);
}
module.run(['$templateCache', function($templateCache) {
  $templateCache.put('/bupa/core/useful-links/UsefulLinks.html',
    '<div class="bupaFooter"><div class="usefulDocs"><h1>Useful links</h1><p>More links and additional information for the Bupa codes.</p><ul cg-busy="usefulLinksCtrlFetch"><li ng-repeat="usefulLink in usefulLinks"><a rel="new-window" target="_blank" tooltip="Opens in a new window" ng-href="{{usefulLink.Value__c}}">{{usefulLink.Name}}</a></li></ul></div></div>');
}]);
})();

(function(module) {
try {
  module = angular.module('bupa-templates');
} catch (e) {
  module = angular.module('bupa-templates', []);
}
module.run(['$templateCache', function($templateCache) {
  $templateCache.put('/bupa/core/useful-documents/UsefulDocuments.html',
    '<div class="bupaFooter"><div class="usefulDocs"><h1>Useful documents</h1><p>The links below provide downloads and additional information for the Bupa codes.</p><div class="contactOptions"><ul class="clearfix"><li ng-repeat="attachmentWrapper in attachmentWrappers"><a ng-href="/servlet/servlet.FileDownload?file={{attachmentWrapper.attachment.Id}}" target="_blank">{{attachmentWrapper.attachment.Name}} ></a><br/><span>({{attachmentWrapper.attachment.fileType}}, {{attachmentWrapper.attachment.fileSizeInKB}}KB)</span></li><li><a ng-if="hideBenefitMaxima !== true" data-animation="am-fade-and-slide-top" data-content-template="/bupa/core/benefit-maxima/BenefitMaxima.html" bs-modal="modal">Benefit maxima ></a><br/><span>&nbsp;</span></li><li><a ng-if="hideEssentialNotes !== true" data-animation="am-fade-and-slide-top" data-content-template="/bupa/core/essential-notes/EssentialNotes.html" bs-modal="modal">Essential notes ></a><br/><span>&nbsp;</span></li><li><a ng-if="hideAppendices !== true" data-animation="am-fade-and-slide-top" data-content-template="/bupa/core/appendices/Appendices.html" bs-modal="modal">Appendices ></a><br/><span>&nbsp;</span></li></ul></div></div></div>');
}]);
})();
