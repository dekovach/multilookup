function MLoptions() {
    this.seURLs = [];
}
MLoptions.prototype = {
    editSE: null,
	editGroup: null,
	optionsTab: null,
	
    init : function()
    {
	    //open or reuse a tab
    	var optionsTab = this.openAndReuseOneTabPerAttribute('multilookup-tabattr', 'chrome://multilookup/content/ml-options.html');
    	this.optionsTab = optionsTab;
		var newTabBrowser = gBrowser.getBrowserForTab(optionsTab);
		//gBrowser.selectedTab = newTab;
		if (newTabBrowser.contentDocument.readyState == "complete") {
			this.configureOrder(newTabBrowser);
		} else {
			newTabBrowser.addEventListener("load", function () {
				// Configure each tab
	        	MLoptions.configureOrder(this);

			}, true);
		}
	},
	
	accept : function()
    {
        // Save settings
        try {
            

            
        } catch(e) {
            
            alert("Multi-lookup Oh no! There was an error saving your settings.\n\nError: "+e);
        }
        
	return true;
    },
    
    cancel : function()
    {
        return true;  
    },
 
    
	selectTab: function(tab) {
		
	},
	
    configureSE : function()
    {
		var liSE = document.getElementById('ml-opt-search-engines-list');
		try {
			var llURLs = Multilookup.Storage.loadURLs();
			// alert(llURLs);
			
			for(obj in llURLs) {
				var liRow = document.createElement("li");
				liRow.setAttribute("rowid", llURLs[obj].rowid);
				liRow.textContent = llURLs[obj].label;
			
				liSE.appendChild(liRow);
				
			}
	   } catch(e) {
			
			alert("Multi-lookup Oh no! There was an error saving your settings.\n\nError: "+e);
		}
			
		return true;
    },
	
    deleteSE: function(rowid) {
		var rowid;
		if (MLoptions.editSE != null){
			rowid = MLoptions.editSE.getAttribute('rowid');
		} else {
			return true;
		}
		if (confirm("Delete search engine?")) {
			Multilookup.Storage.deleteSE(rowid);
			MLoptions.refreshList();
		}
	},
	
	refreshList: function() {
		
		var list = document.getElementById('ML_lb_Search_engines');
		var liElems = list.getElementsByTagName('listitem');
		for(i=liElems.length-1; i>=0; i--) 
			list.removeChild(liElems[i]);
		
		MLoptions.configureSE();
		MLoptions.editSE = null;
		document.getElementById('ML_newLabel').value = "";
		document.getElementById('ML_newURL').value = "";
		
		window.opener.Multilookup.Main.initSEs();
		window.opener.Multilookup.Toolbar.init();
		
	},
	
	 // -- Groups -- //
    
    configureGroups : function()
    {
		var liGroups = document.getElementById('ML_lb_groups');
		try {
			var groups = Multilookup.Storage.loadGroups();
			
			for(obj in groups) {
				var liRow = document.createElement("listitem");
				liRow.setAttribute("rowid", groups[obj].rowid);
				var lcLabel = document.createElement("listcell");
				lcLabel.setAttribute("label", groups[obj].label);
				var lcKey = document.createElement("listcell");
				lcKey.setAttribute("label", groups[obj].key);
				
				liRow.appendChild(lcLabel);
				liRow.appendChild(lcKey);
				liGroups.appendChild(liRow);
				
			}
	   } catch(e) {
			
			alert("Multi-lookup Oh no! There was an error saving your group settings.\n\nError: "+e);
		}
			
		return true;
    },
	
	selectGroup: function(event) {
		MLoptions.editGroup = event.currentTarget.currentItem;
		document.getElementById('ML_newGroup').value = MLoptions.editGroup.children[0].getAttribute('label');
		document.getElementById('ML_newGroupKey').value = MLoptions.editGroup.children[1].getAttribute('label');
		console.log(event);
	},
	
	newGroup: function(event) {
		MLoptions.editGroup = null;
		document.getElementById('ML_newGroup').value = "";
		document.getElementById('ML_newGroup').value = "";
	},
	
	setGroup: function(event) {
		// alert("setSE");
		var rowid = null;
		if (MLoptions.editGroup != null){
			rowid = MLoptions.editGroup.getAttribute('rowid');
		}
		
		var newGroup = document.getElementById('ML_newGroup').value;
		var newKey = document.getElementById('ML_newGroupKey').value;
		
		Multilookup.Storage.setGroup(rowid, newGroup, newKey);
		
		this.refreshGroupList();
	},
    
    deleteGroup: function(event) {
		// alert("deleteSE");
		var rowid;
		if (MLoptions.editGroup != null){
			rowid = MLoptions.editGroup.getAttribute('rowid');
		} else {
			return true;
		}
		if (confirm("Delete this group of search engines?")) {
			Multilookup.Storage.deleteGroup(rowid);
			this.refreshGroupList();
		}
	},
	
	refreshGroupList: function() {
		//update context menu

		Multilookup.Main.initGroups();
		Multilookup.Toolbar.init();
		//TODO fire an event to update UI
	},
	
	configureOrder: function(optionsTabBrowser) {
		var doc = optionsTabBrowser.contentDocument;
		var ulSE = doc.getElementById('search_engines');
		var ulGroups = doc.getElementById('groups');
		
		while(ulSE.firstChild) {
			ulSE.removeChild(ulSE.firstChild);
		}
		while(ulGroups.firstChild) {
			ulGroups.removeChild(ulGroups.firstChild);
		}
		
		try {
			//load groups
			var groups = Multilookup.Storage.loadGroups();
			var llURLs = Multilookup.Storage.loadURLs();
			
			
			for(obj in groups) {
				var liGroup = doc.createElement("li");
				liGroup.setAttribute('class', 'ui-state-default ui-state-disabled group-elem ui-icon-folder-open');
				liGroup.setAttribute('ml-type', "group");
				liGroup.setAttribute('rowid', groups[obj].rowid);
				liGroup.setAttribute('key', groups[obj].key);
				var liSpanIconFolder = doc.createElement("span");
				liSpanIconFolder.setAttribute('class', 'ui-icon ui-icon-folder-open');
				liGroup.appendChild(liSpanIconFolder);
				liGroup.appendChild(document.createTextNode(groups[obj].label));
				var liDiv = doc.createElement('div');
				liDiv.setAttribute('class', 'edit-se');
				var liSpanEdit = doc.createElement("span");
				liSpanEdit.setAttribute('class', 'ui-icon ui-icon-pencil se-edit');
				liDiv.appendChild(liSpanEdit);
				var liSpanRemove = doc.createElement("span");
				liSpanRemove.setAttribute('class', 'ui-icon ui-icon-close se-remove');
				liDiv.appendChild(liSpanRemove);
				liGroup.appendChild(liDiv);
				ulGroups.appendChild(liGroup);
				
				var spliceList = [];
		
				for(i in llURLs) {
					if (llURLs[i].group_id == groups[obj].rowid) {
						var liSE = doc.createElement("li");
						liSE.setAttribute('class', 'ui-state-default se-elem');
						liSE.setAttribute('ml-type', "se");
						liSE.setAttribute('rowid', llURLs[i].rowid);
						liSE.setAttribute('se-label', llURLs[i].label);
						var liSpanIconSearch = doc.createElement("span");
						liSpanIconSearch.setAttribute('class', 'ui-icon ui-icon-search');
						liSE.appendChild(liSpanIconSearch);
						liSE.appendChild(doc.createTextNode(llURLs[i].label));
						liSE.appendChild(doc.createElement('br'));
						liSE.appendChild(doc.createTextNode(llURLs[i].url));
						liSE.appendChild(liDiv.cloneNode(true));
						ulGroups.appendChild(liSE);
						
						spliceList.push(i);
					}
				}
				
				//clean llURLs 
				spliceList.sort(mlSortNumberDesc);
				for (j in spliceList) {
					llURLs.splice(spliceList[j],1);
				}
				
			}
			
			var liSEAnchor = doc.createElement("li");
			liSEAnchor.setAttribute('class', 'ui-state-default ui-state-disabled');
			liSEAnchor.textContent = "Not Grouped Search Engines";
			ulSE.appendChild(liSEAnchor);
			
			for(obj in llURLs) {
				var liSE = doc.createElement("li");
				liSE.setAttribute('class', 'ui-state-default se-elem');
				liSE.setAttribute('ml-type', "se");
				liSE.setAttribute('rowid', llURLs[obj].rowid);
				liSE.setAttribute('se-label', llURLs[obj].label);
				
				var liSpanIconSearch = doc.createElement("span");
				liSpanIconSearch.setAttribute('class', 'ui-icon ui-icon-search');
				liSE.appendChild(liSpanIconSearch);
				liSE.appendChild(doc.createTextNode(llURLs[obj].label));
				liSE.appendChild(doc.createElement('br'));
				liSE.appendChild(doc.createTextNode(llURLs[obj].url));
				liSE.appendChild(liDiv.cloneNode(true));				
				ulSE.appendChild(liSE);
				
			}
			

			
	   } catch(e) {
			
			alert("Multi-lookup Oh no! There was an error loading your group and order settings.\n\nError: "+e);
		}
			
		return true;
	},
	
	saveOrder: function(optionsDocument) {
		var doc = optionsDocument;
		var ulGroups = doc.getElementById('groups');
		
		var currGID = null;
		var order = Array();
		var lclOrd = 1;
		
		for(i=0; i<ulGroups.children.length; i++) {
			var liElem = ulGroups.children[i];
			if (liElem.hasAttribute('ml-type') && liElem.getAttribute('ml-type') == 'group') {
				currGID = liElem.getAttribute('rowid');
				lclOrd = 1;
			} else if (liElem.hasAttribute('ml-type') && liElem.getAttribute('ml-type') == 'se') {
				var obj = {'rowid' : liElem.getAttribute('rowid'),
							'groupId' : currGID,
							'orderId' : lclOrd.toString()};
				order.push(obj);
				lclOrd++;
			}
		}
		Multilookup.Storage.updateGroupAndOrder(order);
		
		var ulSE = doc.getElementById('search_engines');
		
		var noOrder = Array();
		
		for(i=0; i<ulSE.children.length; i++) {
			var liElem = ulSE.children[i];
			if (liElem.hasAttribute('ml-type') && liElem.getAttribute('ml-type') == 'se') {
				var obj = {'rowid' : liElem.getAttribute('rowid')};
				noOrder.push(obj);
				
			}
		}
		Multilookup.Storage.resetGroupAndOrder(noOrder);
		
		this.sendMsg("order-save-success", doc);
	},
	
    receiveMsg: function(e) {
		var msg = e.target.getAttribute("msg");
		var optionsTabBrowser = gBrowser.getBrowserForTab(this.optionsTab);
		if (!!msg) {
			switch (msg) {
				case "save-order": 
					MLoptions.saveOrder(e.target.ownerDocument);
				break;
				case "cancel-order":
				break;
				case "save-se":
					var data = this.extractData(e);
					Multilookup.Storage.setSE(data.rowid, "", data.url, data.label);
				break;
				case "delete-se":
					var dataDel = this.extractData(e);
					Multilookup.Storage.deleteSE(dataDel.rowid);
				break;
				case "save-group":
					var dataGroup = this.extractData(e);
					Multilookup.Storage.setGroup(dataGroup.rowid, dataGroup.label, dataGroup.key);
					this.saveOrder(e.target.ownerDocument);
					this.refreshGroupList();
				break;
				case "delete-group":
					var dataDelGroup = this.extractData(e);
					Multilookup.Storage.deleteGroup(dataDelGroup.rowid);
					this.saveOrder(e.target.ownerDocument);
					this.refreshGroupList();
				break;
			}  
			this.configureOrder(optionsTabBrowser);
		}
	},
	
	sendMsg: function(msg, doc) {
		if (doc != null) {
			var inport = doc.getElementById("ml-options-inport");
			inport.setAttribute("msg", msg);
			var event = doc.createEvent("HTMLEvents");
			event.initEvent("multilookupOptionsEvent", true, false);
			inport.dispatchEvent(event);
		}
	},
	
	extractData: function(e) {
		//get the data
		var optionsTabBrowser = gBrowser.getBrowserForTab(this.optionsTab);
		var doc = optionsTabBrowser.contentDocument;
		var textData = e.target.textContent;
		if (!textData)
			return;
		try {
			var data = JSON.parse(textData);
		}  catch(ex) {
			console.log(ex);
		}
		return data;
	},
	
	openAndReuseOneTabPerAttribute: function(attrName, url) {
	  var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
	                     .getService(Components.interfaces.nsIWindowMediator);
     
	  for (var found = false, index = 0, tabbrowser = wm.getEnumerator('navigator:browser').getNext().gBrowser;
	       index < tabbrowser.tabContainer.childNodes.length && !found;
	       index++) {
	 
		    // Get the next tab
		    var currentTab = tabbrowser.tabContainer.childNodes[index];
	   
		    // Does this tab contain our custom attribute?
		    if (currentTab.hasAttribute(attrName)) {
	 
			  // Yes--select and focus it.
			  tabbrowser.selectedTab = currentTab;
	 
	      // Focus *this* browser window in case another one is currently focused
	      tabbrowser.ownerDocument.defaultView.focus();
	      found = true;
	      return currentTab;
	    }
	  }
	 
	  	if (!found) {
		    // Our tab isn't open. Open it now.
			var browserEnumerator = wm.getEnumerator("navigator:browser");
		    var tabbrowser = browserEnumerator.getNext().gBrowser;
		   
		    // Create tab
			var newTab = tabbrowser.addTab(url);
			newTab.setAttribute(attrName, "xyz");
		   
		    // Focus tab
			tabbrowser.selectedTab = newTab;
		 
			// Focus *this* browser window in case another one is currently focused
		    tabbrowser.ownerDocument.defaultView.focus();
		    return newTab;
		}
	}
	    
};

MLoptions = new MLoptions();

function mlSortNumberDesc(a,b)
{
	return b - a;
}

window.addEventListener("multilookupAddonEvent", function(e) { MLoptions.receiveMsg(e); }, false, true);