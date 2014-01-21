/*
 * namespace.
 */
if ("undefined" == typeof(Multilookup)) {
  var Multilookup = {};
};

//console = Components.utils.import("resource://gre/modules/devtools/Console.jsm").console;

/*
 * Main methods of the extension
 */
 
Multilookup.Main = {
	groups: null,
	SEs: null,
				  
	initOverlay: function() {
		// console.log("init multilookup");
		var menu = document.getElementById("contentAreaContextMenu");
		menu.addEventListener("popupshowing", function (e){ Multilookup.Main.contextPopupShowing(e); }, false);
		Multilookup.Storage.init();
		Multilookup.Main.initGroups();
		Multilookup.Main.initSEs();
		// Multilookup.Searchbar.init();
		Multilookup.Toolbar.init();
	},
	
	initGroups: function() {
		try {
			this.groups = Multilookup.Storage.loadGroups();
			
			var menu = document.getElementById("contentAreaContextMenu");
			//load the search groups
			var miElems = menu.getElementsByClassName("multi-lookup-menuitem");
			for(i=miElems.length-1; i>=0; i--) 
				menu.removeChild(miElems[i]);
		
			for(obj in this.groups) {
				var menuItem = Multilookup.Main.createMenuItem("Multi-lookup " + this.groups[obj].label);
				menuItem.setAttribute("group_id", this.groups[obj].rowid);
				menuItem.setAttribute("class", "multi-lookup-menuitem");
				menuItem.addEventListener("click", function(event) {Multilookup.Main.multiLookup(event);}, false);
				menu.appendChild(menuItem);
				
			}
		} catch(e) {
			alert("Multi-lookup Oh no! There was an error retrieveing your group settings.\n\nError: "+e);
		}
	},
	
	initSEs: function() {
		try {
			this.SEs = Multilookup.Storage.loadURLs();
			
		} catch(e) {
			alert("Multi-lookup Oh no! There was an error retrieveing your search engines.\n\nError: "+e);
		}
	},
	
	contextPopupShowing: function(event) {
			
		var groupsUpdated = Application.storage.get("multilookup.groups", false);	
		if (groupsUpdated) 
			Multilookup.Main.initGroups();
		gContextMenu.showItem("multilookup-menu-item", gContextMenu.isTextSelected);
		// var menuitem = document.getElementById("multilookup-menu-item");
		// if(menuitem) {
			// menuitem.hidden = true;
			// menuitem.setAttribute('hidden', 'true');
		// }
	},
	
	getSearchString: function() {
        var s = new String();
        if (content.document.selection && content.document.selection.createRange) {
            s = content.document.selection.createRange().text;
        } else if (content.document.getSelection) {
            s = content.document.getSelection();
        }
        if (!(s && s.toString().length)) {
            //nothing selected
			console.log('Multi-lookup: Nothing selected');
        }
        return s.toString();
    },
	
	createMenuItem: function(aLabel) {
		const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
		var item = document.createElementNS(XUL_NS, "menuitem"); // create a new XUL menuitem
		item.setAttribute("label", aLabel);
		return item;
	},
	
	createMenuSeparator: function() {
		const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
		var item = document.createElementNS(XUL_NS, "menuseparator"); // create a new XUL menuitem
	return item;
	},
	
	
	multiLookup: function( event ) {
		// alert(Multilookup.Main.getSearchString());
		s = this.trim( Multilookup.Main.getSearchString() );
		
		var group_id = event.currentTarget.getAttribute( "group_id" );
		
		//populate searchbar textbox with the selected text
		var tsTbox = document.getElementById( "ml-toolbar-search-tbox" );
		if ( tsTbox ) {
			tsTbox.value = s;
			var t=setTimeout( "document.getElementById('ml-toolbar-search-tbox').focus()", 500 );
			
			var tgMnpp = document.getElementById( "ml-toolbar-group-mnpp" );
			tgMnpp.parentNode.selectedItem = tgMnpp.getElementsByAttribute( "group_id", group_id )[0];
			
		}
		
		// alert(group_id);
		//load search urls from database
		var llURLs = Multilookup.Storage.loadURLs(group_id);
		
		
		for(obj in llURLs)
			this.openAndReuseOneTabPerURL(llURLs[obj].url, llURLs[obj].base_url, s);
	},
	
	multiLookupByGroup: function(group_id, search_terms) {
		//load search urls from database
		var llURLs = Multilookup.Storage.loadURLs(group_id);
		
		search_terms = this.trim(search_terms);
		for(obj in llURLs)
			this.openAndReuseOneTabPerURL(llURLs[obj].url, llURLs[obj].base_url, search_terms);
		
		//check if microlearn integration is ON
		var isMicroLearningOn = document.getElementById("ml-integrate-microlearn").checked;
		if (isMicroLearningOn) {
			//broadcast a multilookup event
			Multilookup.Main.broadCastMultilookupEvent(search_terms);
		}
	},
	
	lookupByURL: function(se_url, se_base_url, search_terms) {
		//load search urls from database
		this.openAndReuseOneTabPerURL(se_url, se_base_url, this.trim(search_terms));
		
		//check if microlearn integration is ON
		var isMicroLearningOn = document.getElementById("ml-integrate-microlearn").checked;
		if (isMicroLearningOn) {
			//broadcast a multilookup event
			Multilookup.Main.broadCastMultilookupEvent(search_terms);
		}
	},
	
	trim: function (str, chars) {
		chars = chars || "\\s";
		var str2 = new String(str);
		str2 = str2.replace(new RegExp("^[" + chars + "]+", "g"), "");
		str2 = str2.replace(new RegExp("[" + chars + "]+$", "g"), "");
		return str2;
	},
	
	openAndReuseOneTabPerURL: function (url, baseURL, param) {
	  var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
						 .getService(Components.interfaces.nsIWindowMediator);
	  var browserEnumerator = wm.getEnumerator("navigator:browser");

	  // Check each browser instance for our URL
	  var found = false;
	  while (!found && browserEnumerator.hasMoreElements()) {
	  // while (index < browserInstance.mTabContainer.childNodes.length && !found) {
		
		// var currentTab = browserInstance.mTabContainer.childNodes[index];
		
		var browserWin = browserEnumerator.getNext();
		var tabbrowser = browserWin.gBrowser;

		// Check each tab of this browser instance
		var numTabs = tabbrowser.browsers.length;
		for (var index = 0; index < numTabs; index++) {
		  var currentBrowser = tabbrowser.getBrowserAtIndex(index);
		  var mlTabURL = tabbrowser.tabs[index].getAttribute("multilookup-url");
		  if (!!mlTabURL && mlTabURL == url) {
		  // if (currentBrowser.currentURI.spec.indexOf(baseURL) > -1) {
	
			// The URL is already opened. Select this tab.
			// tabbrowser.selectedTab = tabbrowser.tabContainer.childNodes[index];
		  	var searchUrl = this.buildSearchURL(url, param);
			currentBrowser.loadURI(searchUrl);
			
			// Focus *this* browser-window
			browserWin.focus();

			found = true;
			break;
		  }
		}
	  }

	  // Our URL isn't open. Open it now.
	  if (!found) {
		var recentWindow = wm.getMostRecentWindow("navigator:browser");
		if (recentWindow) {
		  // Use an existing browser window
		  // var mlTab = recentWindow.delayedOpenTab(url + param, null, null, null, null);
		  var browserEnumerator2 = wm.getEnumerator("navigator:browser");
		  var browserInstance = browserEnumerator2.getNext().getBrowser(); 
		  var searchUrl = this.buildSearchURL(url, param);
		  var mlTab = browserInstance.addTab(searchUrl);
		  mlTab.setAttribute( "multilookup-url", url);
		}
		else {
		  // No browser windows are open, so open a new one.
		  window.open(buildSearchURL(url, param));
		}
	  }
	},
	
	closeAllMLTabs: function () {
	  var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
						 .getService(Components.interfaces.nsIWindowMediator);
	  var browserEnumerator = wm.getEnumerator("navigator:browser");

	  while (browserEnumerator.hasMoreElements()) {
		var browserWin = browserEnumerator.getNext();
		var tabbrowser = browserWin.gBrowser;

		// Check each tab of this browser instance
		var numTabs = tabbrowser.browsers.length;
		
		for (var index = numTabs-1; index >= 0; index--) {
		  var currentBrowser = tabbrowser.getBrowserAtIndex(index);
		  var mlTabURL = tabbrowser.tabs[index].getAttribute("multilookup-url");
		  if (!!mlTabURL) {
			// The URL is already opened. Close this tab.
			tabbrowser.selectTabAtIndex( index, null );
			tabbrowser.removeCurrentTab();
			// tabbrowser.removeTab(currentBrowser); //buggy. it should work, but throws an error
			
		  }
		}
	  }
	},
	
	buildSearchURL: function(url, param) {
		if (null != url.match('XYZ123')) {
			return url.replace(/XYZ123/ig,encodeURIComponent(param));
		} else {
			return url + encodeURIComponent(param);
		}
	},
	
	mlNavbarListener: function(e) {
		alert(e);
	},
	
	broadCastMultilookupEvent: function(msg) {
		var bctPort = document.getElementById('broadcast-port-microlearn');
		if (bctPort) {
			bctPort.setAttribute('msg', msg);
			var evt = document.createEvent("Events");
			evt.initEvent("multilookupBroadcastEvent", true, false);
			bctPort.dispatchEvent(evt);
		}
	}
};

Multilookup.Toolbar = {
	init: function() {
	
		var groupList = document.getElementById("ml-toolbar-group-mnpp");
		var miElems = groupList.getElementsByClassName("ml-toolbar-group-menuitem");
		for(i=miElems.length-1; i>=0; i--) 
			groupList.removeChild(miElems[i]);
	
		for (obj in Multilookup.Main.groups) {
			var menuItem = Multilookup.Main.createMenuItem(Multilookup.Main.groups[obj].label);
			menuItem.setAttribute("group_id", Multilookup.Main.groups[obj].rowid);
			menuItem.setAttribute("class", "ml-toolbar-group-menuitem");
			// menuItem.addEventListener("click", function(event) {alert(event);}, false);
			groupList.appendChild(menuItem);
		}
		
		var menuSeparator = Multilookup.Main.createMenuSeparator();
		menuSeparator.setAttribute("class", "ml-toolbar-group-menuitem");
		groupList.appendChild(menuSeparator);
		
		for (obj in Multilookup.Main.SEs) {
			var menuItem = Multilookup.Main.createMenuItem(Multilookup.Main.SEs[obj].label);
			menuItem.setAttribute("group_id", 0);
			menuItem.setAttribute("class", "ml-toolbar-group-menuitem");
			menuItem.setAttribute("se_url", Multilookup.Main.SEs[obj].url);
			menuItem.setAttribute("se_base_url", Multilookup.Main.SEs[obj].base_url);
			// menuItem.addEventListener("click", function(event) {alert(event);}, false);
			groupList.appendChild(menuItem);
		}
		
		groupList.parentNode.selectedIndex = 0;
	}, 
	
	multiLookupToolbar: function() {
		var strSearch = new String(document.getElementById("ml-toolbar-search-tbox").value);
		var search_terms = Multilookup.Main.trim(strSearch);
		if (search_terms) {
			var group_id = document.getElementById("ml-toolbar-group-mnpp").parentNode.selectedItem.getAttribute("group_id");
			if (group_id > 0) {
				Multilookup.Main.multiLookupByGroup(group_id, search_terms);
			} else {
				var se_url = document.getElementById("ml-toolbar-group-mnpp").parentNode.selectedItem.getAttribute("se_url");
				var se_base_url = document.getElementById("ml-toolbar-group-mnpp").parentNode.selectedItem.getAttribute("se_base_url");
				Multilookup.Main.lookupByURL(se_url, se_base_url, search_terms);
			}
			Multilookup.Storage.historyify(group_id, search_terms, search_terms);
		}
	},
	
	openOptions: function() {
		
	}
};

Multilookup.Searchbar = {  
	init: function() {
		var browserSearchService = Components.classes["@mozilla.org/browser/search-service;1"]
                           .getService(Components.interfaces.nsIBrowserSearchService);
		var sb = document.getElementById('searchbar');
		if (browserSearchService.currentEngine.name == "Multilookup") {
		
			sb.addEventListener('keypress', Multilookup.Searchbar.search, true);
			sb.addEventListener('focus', Multilookup.Searchbar.focusOnlyTerms, false);
		} else {
			//check if multilookup search engine is installed
			var mlEngineFound = false;
			for (eng in engines = browserSearchService.getEngines()) {
				if (engines[eng].name == "Multilookup")
					mlEngineFound = true;
			}
			
			if (!mlEngineFound) {
			 // window.external.AddSearchProvider("https://addons.mozilla.org/de/firefox/addon/multilookup");
			} else {
				sb.removeEventListener('keypress', Multilookup.Searchbar.search, true);
				sb.removeEventListener('focus', Multilookup.Searchbar.focusOnlyTerms, false);
			}
		}
	},
	
	SEObserver: {
	  register: function() {  
		
		var os = Components.classes["@mozilla.org/observer-service;1"]
					.getService(Components.interfaces.nsIObserverService);

		os.addObserver(this, "browser-search-engine-modified", false); 
	  },  
	  
	  unregister: function() {  
		   var os = Components.classes["@mozilla.org/observer-service;1"]
			.getService(Components.interfaces.nsIObserverService);
		
		os.removeObserver(this, "browser-search-engine-modified"); 
	  },  
	  
		observe: function(aSubject, aTopic, aData) {  
			var sb = document.getElementById('searchbar');
			if (aSubject.name == "Multilookup") {
				
				sb.addEventListener('keypress', Multilookup.Searchbar.search, true);
				sb.addEventListener('focus', Multilookup.Searchbar.focusOnlyTerms, false);
			} else {
				// alert(aSubject.name);
				sb.removeEventListener('keypress', Multilookup.Searchbar.search, true);
				sb.removeEventListener('focus', Multilookup.Searchbar.focusOnlyTerms, false);
			}
		}  
	},
	
	search: function(e) {
		if(e.keyCode == 13) {
			// alert(e);
			// var browserSearchService = Components.classes["@mozilla.org/browser/search-service;1"]
                           // .getService(Components.interfaces.nsIBrowserSearchService);
			// if (browserSearchService.currentEngine.name != "Multilookup") 
					// return true;
			
			var strSearch = new String(e.originalTarget.value);
			strSearch = Multilookup.Main.trim(strSearch);
			var se = strSearch.substr(0, strSearch.indexOf(" "));
			var validSE = false;
			var grpLabels = [];
			var groupId;
			for (g in Multilookup.Main.groups) {
				grpLabels.push(Multilookup.Main.groups[g].key);
				if (Multilookup.Main.groups[g].key.toLowerCase() === se.toLowerCase()) {
					validSE = true;
					group_id = Multilookup.Main.groups[g].rowid;
				}
			}
			
			if (!validSE) {
				//alert("Invalid search engine prefix. Please use one of the following prefixes:\n" + grpLabels.toString());
				return true;
			} else {
				//parse search string to see which engine should be used
				e.preventDefault();
				var search_terms = strSearch.slice(strSearch.indexOf(" "));
				Multilookup.Main.multiLookupByGroup(group_id, search_terms);
				Multilookup.Storage.historyify(group_id, strSearch, search_terms);
			}
		}
	},
	
	focusOnlyTerms: function(e) {
		console.log("searchbar input focus event");
		
		var strSearch = new String(e.originalTarget.value);
		strSearch = Multilookup.Main.trim(strSearch);
		
		if (strSearch == "" || !strSearch)
			return;
		
		var se = strSearch.substr(0, strSearch.indexOf(" "));
		var validSE = false;
		for (g in Multilookup.Main.groups) {
			if (Multilookup.Main.groups[g].key.toLowerCase() === se.toLowerCase()) {
				validSE = true;
			}
		}
		
		if (validSE) {
			
			setTimeout(function() { Multilookup.Searchbar.createSelection(e.originalTarget, strSearch.indexOf(" ") + 1, strSearch.length); }, 50);
			e.preventDefault();
			e.stopPropagation();
		}
	},
	
	createSelection: function (field, start, end) {
        if( field.createTextRange ) {
            var selRange = field.createTextRange();
            selRange.collapse(true);
            selRange.moveStart('character', start);
            selRange.moveEnd('character', end);
            selRange.select();
        } else if( field.setSelectionRange ) {
            field.setSelectionRange(start, end);
        } else if( field.selectionStart ) {
            field.selectionStart = start;
            field.selectionEnd = end;
        }
        // field.focus();
		var selectedText = field.value.substring(field.selectionStart, field.selectionEnd);
		console.log("selection created: " + selectedText);
    }       
		
};

window.addEventListener("load", Multilookup.Main.initOverlay, false);
window.addEventListener("multilookupNavbarEvent", function(e) { Multilookup.Main.mlNavbarListener(e); }, false, true);
Multilookup.Searchbar.SEObserver.register();  
