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
