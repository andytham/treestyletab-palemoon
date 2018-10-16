/**
 * Bookmark Multiple Tabs library for Firefox 2 or later
 *
 * Usage:
 *   First, load this file into three Chrome documents:
 *     * chrome://browser/content/browser.xul
 *     * chrome://browser/content/places/bookmarkProperties.xul
 *     * chrome://browser/content/places/bookmarkProperties2.xul
 *
 *   Then, run this line in your JS files:
 *     window['piro.sakura.ne.jp'].bookmarkMultipleTabs.addBookmarkFor(tabsArray, folderName);
 *
 * license: The MIT License, Copyright (c) 2009-2016 YUKI "Piro" Hiroshi
 *   http://github.com/piroor/fxaddonlib-bookmark-multiple-tabs/blob/master/license.txt
 * original:
 *   http://github.com/piroor/fxaddonlib-bookmark-multiple-tabs
 */
(function() {
	const currentRevision = 9;
	if (!('BookmarkPropertiesPanel' in window)) {
		window.addEventListener('DOMContentLoaded', function() {
			window.removeEventListener('DOMContentLoaded', arguments.callee, true);
			if (!('piro.sakura.ne.jp' in window)) window['piro.sakura.ne.jp'] = {};
			var loadedRevision = 'bookmarkMultipleTabs' in window['piro.sakura.ne.jp'] ?
					window['piro.sakura.ne.jp'].bookmarkMultipleTabs.revision :
					0 ;
			if (loadedRevision && loadedRevision > currentRevision) {
				return;
			}
			var addBookmarkTabsFilter = function(aTab) { return aTab.linkedBrowser.currentURI; };
			// Tab Mix Plus modifies the API.
			if ('TMP_Places' in window && 'getTabFixedTitle' in TMP_Places) {
				addBookmarkTabsFilter = function(aTab) {
					var b = aTab.linkedBrowser;
					var uri = b.currentURI;
					return {
						uri   : uri,
						title : TMP_Places.getTabFixedTitle(b, uri)
					};
				};
			}
			window['piro.sakura.ne.jp'].bookmarkMultipleTabs = {
				revision : currentRevision,
				addBookmarkFor : function(aTabs, aFolderName) 
				{
					if (!aTabs) return;
					var b = this.getTabBrowserFromChild(aTabs[0]);
					if ('PlacesUIUtils' in window || 'PlacesUtils' in window) { // Firefox 3 or later
						try {
							var utils = 'PlacesUIUtils' in window ? PlacesUIUtils : PlacesUtils ;
							var tabs = [...aTabs].map(this.addBookmarkTabsFilter);
							if (aFolderName)
								this.Prefs.setCharPref('temp.showMinimalAddMultiBookmarkUI.folderName', unescape(encodeURIComponent(aFolderName)));
							if ('showBookmarkDialog' in utils) { // Firefox 9 or later
								utils.showBookmarkDialog({
									action  : 'add',
									type    : 'folder',
									// title   : aFolderName, // don't specify it, because Firefox doesn't create bookmarks if the title is given!
									URIList : tabs,
									hiddenRows : ['description', 'location', 'loadInSidebar', 'keyword']
								}, window);
							}
							else {
								throw new Error('there is no method to create bookmarks from tabs!');
							}
						}
						catch(e) {
							alert(e.message+'\n'+e.stack);
						}
						finally {
							this.Prefs.clearUserPref('temp.showMinimalAddMultiBookmarkUI.folderName');
						}
						return;
					}
					var currentTabInfo;
					var tabsInfo = [...aTabs].map(function(aTab) {
							var webNav = aTab.linkedBrowser.webNavigation;
							var url    = webNav.currentURI.spec;
							var name   = '';
							var charSet, description;
							try {
								var doc = webNav.document;
								name = doc.title || url;
								charSet = doc.characterSet;
								description = BookmarksUtils.getDescriptionFromDocument(doc);
							}
							catch (e) {
								name = url;
							}
							return {
								name        : name,
								url         : url,
								charset     : charSet,
								description : description
							};
						});
					window.openDialog(
						'chrome://browser/content/bookmarks/addBookmark2.xul',
						'',
						BROWSER_ADD_BM_FEATURES,
						(aTabs.length == 1 ?
							tabsInfo[0] :
							{
								name             : (aFolderName || gNavigatorBundle.getString('bookmarkAllTabsDefault')),
								bBookmarkAllTabs : true,
								objGroup         : tabsInfo
							}
						)
					);
				},
				addBookmarkTabsFilter : addBookmarkTabsFilter,
				Prefs : Components.classes['@mozilla.org/preferences-service;1']
							.getService(Components.interfaces.nsIPrefBranch),
				getTabBrowserFromChild : function(aTab) 
				{
					var b = aTab.ownerDocument.evaluate(
							'ancestor-or-self::*[local-name()="tabbrowser"] | '+
							'ancestor-or-self::*[local-name()="tabs" and @tabbrowser]',
							aTab,
							null,
							XPathResult.FIRST_ORDERED_NODE_TYPE,
							null
						).singleNodeValue;
					return (b && b.tabbrowser) || b;
				}
			};
		}, true);
	}
	else {
		if (!BookmarkPropertiesPanel._determineItemInfo ||
			BookmarkPropertiesPanel.__bookmarkMultipleTabs__determineItemInfo)
			return;
		// Defined at http://mxr.mozilla.org/mozilla-central/source/browser/components/places/content/bookmarkProperties.js#73
		const ACTION_ADD = 1;
		BookmarkPropertiesPanel.__bookmarkMultipleTabs__determineItemInfo = BookmarkPropertiesPanel._determineItemInfo;
		BookmarkPropertiesPanel._determineItemInfo = function(...aArgs) {
			var folderNameOverride = null;
			try {
				folderNameOverride = Components.classes['@mozilla.org/preferences;1']
					.getService(Components.interfaces.nsIPrefBranch)
					.getCharPref('temp.showMinimalAddMultiBookmarkUI.folderName');
				folderNameOverride = decodeURIComponent(escape(folderNameOverride));
			}
			catch(e) {
			}
			var retVal = this.__bookmarkMultipleTabs__determineItemInfo.apply(this, aArgs);
			if (folderNameOverride &&
				this._action == ACTION_ADD) {
				let dialogInfo = window.arguments[0];
				if (dialogInfo.type === 'folder' &&
					!('title' in dialogInfo) &&
					'URIList' in dialogInfo) {
					this._title = folderNameOverride;
				}
			}
			return retVal;
		};
	}
})();