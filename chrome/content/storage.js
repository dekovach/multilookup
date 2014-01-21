Components.utils.import("resource://gre/modules/Services.jsm");  
Components.utils.import("resource://gre/modules/FileUtils.jsm");  

if ("undefined" == typeof(Multilookup)) {
  var Multilookup = {};
};

Multilookup.Storage = {
	dbVersion: 6,

	lookupURLs: [{label:"dict.cc", base_url:"dict.cc", url:"http://www.dict.cc/?s=", group_id:2},
				 {label:"Leo", base_url:"dict.leo.org", url:"http://dict.leo.org/ende?lp=ende&lang=de&searchLoc=0&cmpType=relaxed&sectHdr=on&spellToler=&search=", group_id:2},
				 {label:"Google Translate", base_url:"translate.google", url:"http://translate.google.com/#de|en|", group_id:2},
				 {label:"The Free Dictionary", base_url:"thefreedictionary.com", url:"http://www.thefreedictionary.com/", group_id:1},
				 {label:"Wiktionary", base_url:"en.wiktionary.org", url:"http://en.wiktionary.org/wiki/", group_id:1},
				 {label:"Google Image Search", base_url:"google.com", url:"http://www.google.com/search?tbm=isch&q=", group_id:""}],
				 
	defaultGroups: [{label:"English", key:"en"},
					{label:"Deutsch", key:"de"}],
	
	init: function () {
		var dbInitilized = false;
		var upgradeDB = true;

		//compare db versions
		let file = FileUtils.getFile("ProfD", ["multilookup.sqlite"]);  
		let dbConn = Services.storage.openDatabase(file); // Will also create the file if it does not exist  

		try {
			var statement = dbConn.createStatement("SELECT name FROM sqlite_master WHERE type='table' AND name='meta_info'");
			
			if(statement.executeStep()) {
				try {
					var verStmt = dbConn.createStatement("SELECT MAX(version) AS version FROM meta_info");

					if (verStmt.executeStep()) {
						if (verStmt.row.version >= Multilookup.Storage.dbVersion)
							upgradeDB = false;
					}
				} catch(e) {
					
				} finally {
					verStmt.finalize();
				}
			}
		} catch(e) {
			// console.log(e);
		} finally {
	
			statement.finalize();
		}
		
		try {
			var prefManager = Components.classes["@mozilla.org/preferences-service;1"]
								.getService(Components.interfaces.nsIPrefBranch);
			dbInitilized = prefManager.getBoolPref("extensions.multilookup.dbInitialized");
		} catch (e) {
			// console.log(e);
		}
		
		if(upgradeDB){
		
			// var populateDB = true;

			try {
				
					dbConn.executeSimpleSQL("DROP TABLE IF EXISTS search_engines;");
					dbConn.executeSimpleSQL("DROP TABLE IF EXISTS groups;");
					dbConn.executeSimpleSQL("DROP TABLE IF EXISTS history;");
					
					dbConn.executeSimpleSQL("CREATE TABLE search_engines (label TEXT, base_url TEXT, url TEXT, group_id INTEGER, order_id INTEGER);"); 
					var sePopulateStmt = dbConn.createStatement("INSERT INTO search_engines (label,base_url,url,group_id) VALUES(:label,:base_url,:url,:group_id)");
					let params = sePopulateStmt.newBindingParamsArray();  
					for(lURL in Multilookup.Storage.lookupURLs) {  
					  let bp = params.newBindingParams();  
					  bp.bindByName("label", Multilookup.Storage.lookupURLs[lURL].label);
					  bp.bindByName("base_url", Multilookup.Storage.lookupURLs[lURL].base_url);  
					  bp.bindByName("url", Multilookup.Storage.lookupURLs[lURL].url);  
					  bp.bindByName("group_id", Multilookup.Storage.lookupURLs[lURL].group_id);
					  params.addParams(bp);  
					}  
					sePopulateStmt.bindParameters(params); 
					
					sePopulateStmt.executeAsync({  
						handleResult: function(aResultSet) {  

							try{
								prefManager.setBoolPref("extensions.multilookup.dbInitialized", true);
							} catch(e) {
								console.log(e);
							}
							
						},  

						handleError: function(aError) {  
							console.log("Error: " + aError.message);  
						},  

						handleCompletion: function(aReason) {  
							if (aReason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED)  
							  console.log("Query canceled or aborted!");  
						}  
					});  
					
					
					//create groups table
					dbConn.executeSimpleSQL("CREATE TABLE groups (label TEXT, key TEXT);");
					var groupsPopulateStmt = dbConn.createStatement("INSERT INTO groups (label,key) VALUES(:label,:key)");
					let groupParams = groupsPopulateStmt.newBindingParamsArray();  
					for(grp in Multilookup.Storage.defaultGroups) {  
					  let bp = groupParams.newBindingParams();  
					  bp.bindByName("label", Multilookup.Storage.defaultGroups[grp].label);
					  bp.bindByName("key", Multilookup.Storage.defaultGroups[grp].key);
					  groupParams.addParams(bp);  
					}  
					groupsPopulateStmt.bindParameters(groupParams); 
					
					groupsPopulateStmt.executeAsync({  
						handleResult: function(aResultSet) {  

							try{
								prefManager.setBoolPref("extensions.multilookup.dbInitialized", true);
							} catch(e) {
								console.log(e);
							}
							
						},  

						handleError: function(aError) {  
							console.log("Error: " + aError.message);  
						},  

						handleCompletion: function(aReason) {  
							if (aReason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED)  
							  console.log("Query canceled or aborted!");  
						}  
					});  
					//create history table
					dbConn.executeSimpleSQL("CREATE TABLE history (full_string TEXT, search_terms TEXT, group_id INTEGER);");
					//create groups table
					dbConn.executeSimpleSQL("CREATE TABLE IF NOT EXISTS meta_info (version INTEGER PRIMARY KEY);");
				
					miStmt = dbConn.createStatement("REPLACE INTO meta_info (version) VALUES (:version);");
					miStmt.params.version = this.dbVersion;
					
					try{
						miStmt.execute();
					} catch (e) {	
						console.log(e);
					} finally {
						miStmt.finalize();
					}
		
				
			} catch (e) {
				alert("Multilookup SQLite Exception " + e);
			}
			finally {
				// statement.reset();
				// statement.finalize();
				sePopulateStmt.reset();
				sePopulateStmt.finalize();
				groupsPopulateStmt.reset();
				groupsPopulateStmt.finalize();
			}
		
			dbConn.asyncClose();
		
		}
		
	},
	
	loadURLs: function(groupId) {
		var llURLs = Array();
		
		let file = FileUtils.getFile("ProfD", ["multilookup.sqlite"]);  
		let dbConn = Services.storage.openDatabase(file); // Will also create the file if it does not exist  
		var statement;
		if (typeof(groupId) != "undefined") {
			statement = dbConn.createStatement("SELECT rowid, base_url, url, group_id, order_id, label FROM search_engines WHERE group_id=:groupId ORDER BY group_id, order_id");
			statement.params.groupId = groupId;
		} else {
			statement = dbConn.createStatement("SELECT rowid, base_url, url, group_id, order_id, label FROM search_engines ORDER BY group_id, order_id");
		}
		
		try {
			while (statement.step()) {
				var rowSE = {"rowid":statement.row.rowid,
							 "base_url":statement.row.base_url,
							 "url":statement.row.url,
							 "group_id":statement.row.group_id,
							 "order_id":statement.row.order_id,
							 "label":statement.row.label
							 };
				// llURLs[statement.row.name] = statement.row.url;
				llURLs.push(rowSE);
			}
		} catch(e) {
			console.log(e);
		} finally {
			statement.reset();
			statement.finalize();
		}

		dbConn.close();
		
		return llURLs;
	},
	
	setSE: function(rowid, newBaseURL, newURL, newLabel) {
		let file = FileUtils.getFile("ProfD", ["multilookup.sqlite"]);  
		let dbConn = Services.storage.openDatabase(file); // Will also create the file if it does not exist  
		var statement;
		
		if (rowid != null && rowid != "") {
			//it's an update
			statement = dbConn.createStatement("UPDATE search_engines SET base_url=:newBaseURL, url=:newURL, label=:newLabel WHERE rowid=:rowid");
			statement.params.rowid = rowid;
			
		} else {
			statement = dbConn.createStatement("INSERT INTO search_engines (base_url, url, label) VALUES (:newBaseURL,:newURL,:newLabel);");
		}

		statement.params.newLabel = newLabel;
		statement.params.newBaseURL = newBaseURL;
		statement.params.newURL = newURL;

		try{
			statement.execute();
		} catch (e) {	
			console.log(e);
		} finally {
			statement.finalize();
		}
		
		//Multilookup.storeData();
		
		dbConn.asyncClose();
		
	},
	
	deleteSE: function(rowid) {
		let file = FileUtils.getFile("ProfD", ["multilookup.sqlite"]);  
		let dbConn = Services.storage.openDatabase(file); // Will also create the file if it does not exist  
		var statement = dbConn.createStatement("DELETE FROM search_engines WHERE rowid=:rowid");
		statement.params.rowid = rowid;
		
		try{
			statement.execute();
		} catch (e) {	
			console.log(e);
		} finally {
			statement.finalize();
		}
		
		dbConn.close();
	},
	
	loadGroups: function() {
		var groups = Array();
		
		let file = FileUtils.getFile("ProfD", ["multilookup.sqlite"]);  
		let dbConn = Services.storage.openDatabase(file); // Will also create the file if it does not exist  
		
		var statement = dbConn.createStatement("SELECT rowid, label, key FROM groups");
		
		try {
			while (statement.step()) {
				var rowGroup = {"rowid":statement.row.rowid,
								"label":statement.row.label,
								"key":statement.row.key};
				
				groups.push(rowGroup);
			}
		} catch(e) {
			console.log(e);
		} finally {
			statement.reset();
			statement.finalize();
		}

		dbConn.close();
		
		return groups;
	},
	
	setGroup: function(rowid, newLabel, newKey) {
		let file = FileUtils.getFile("ProfD", ["multilookup.sqlite"]);  
		let dbConn = Services.storage.openDatabase(file); // Will also create the file if it does not exist  
		var statement;
		
		if (rowid != null && rowid != "") {
			//it's an update
			statement = dbConn.createStatement("UPDATE groups SET label=:newLabel,key=:newKey WHERE rowid=:rowid");
			statement.params.rowid = rowid;
			
		} else {
			statement = dbConn.createStatement("INSERT INTO groups (label,key) VALUES (:newLabel,:newKey);");
		}

		statement.params.newLabel = newLabel;
		statement.params.newKey = newKey;
		
		try{
			statement.execute();
		} catch (e) {	
			console.log(e);
		} finally {
			statement.finalize();
		}
		
		dbConn.close();
		
	},
	
	deleteGroup: function(rowid) {
		let file = FileUtils.getFile("ProfD", ["multilookup.sqlite"]);  
		let dbConn = Services.storage.openDatabase(file); // Will also create the file if it does not exist  
		var statement = dbConn.createStatement("DELETE FROM groups WHERE rowid=:rowid");
		statement.params.rowid = rowid;
		
		try{
			statement.execute();
		} catch (e) {	
			console.log(e);
		} finally {
			statement.finalize();
		}
		
		dbConn.close();
	},
	
	loadOrder: function() {
	
	},
	
	updateGroupAndOrder: function(order) {
		let file = FileUtils.getFile("ProfD", ["multilookup.sqlite"]);  
		let dbConn = Services.storage.openDatabase(file); // Will also create the file if it does not exist  
	
		var uoPopulateStmt = dbConn.createStatement("UPDATE search_engines SET group_id=:groupId, order_id=:orderId WHERE rowid=:rowId");
	
		try{
			for(ord in order) {  
				uoPopulateStmt.params.groupId = order[ord].groupId;  
				uoPopulateStmt.params.orderId = order[ord].orderId;  
				uoPopulateStmt.params.rowId = order[ord].rowid;  
	
				uoPopulateStmt.execute();
				
			}
		} catch (e) {	
			console.log(e);
		} finally {
			uoPopulateStmt.finalize();
		}
		dbConn.close();
		
//		let params = uoPopulateStmt.newBindingParamsArray();  
//		for(ord in order) {  
//		  let bp = params.newBindingParams();  
//		  bp.bindByName("groupId", order[ord].groupId);  
//		  bp.bindByName("orderId", order[ord].orderId);  
//		  bp.bindByName("rowId", order[ord].rowid);  
//		  params.addParams(bp);  
//		}
//		uoPopulateStmt.bindParameters(params);
//		
//		try{
//			
//			uoPopulateStmt.executeAsync({  
//				handleResult: function(aResultSet) {  
//				// for (let row = aResultSet.getNextRow();  
//					 // row;  
//					 // row = aResultSet.getNextRow()) {  
//
//				  // let value = row.getResultByName("column_name");  
//				// }  
//					// alert('async save success');
//				},  
//
//				handleError: function(aError) {  
//					console.log("Error: " + aError.message);  
//				},  
//
//				handleCompletion: function(aReason) {  
//					if (aReason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED)  
//					  console.log("Query canceled or aborted!");  
//				}  
//			});  
//		} catch (e) {
//			console.log(e);
//		} finally {
//			uoPopulateStmt.finalize();
//		}
//		
//		dbConn.asyncClose();
	},
	
	resetGroupAndOrder: function(noOrder) {
		let file = FileUtils.getFile("ProfD", ["multilookup.sqlite"]);  
		let dbConn = Services.storage.openDatabase(file); // Will also create the file if it does not exist  
	
		var uoPopulateStmt = dbConn.createStatement("UPDATE search_engines SET group_id=null, order_id=null WHERE rowid=:rowId");
		
		try{
			for(ord in noOrder) {  
				uoPopulateStmt.params.rowId = noOrder[ord].rowid;  
	
				uoPopulateStmt.execute();
				
			}
		} catch (e) {	
			console.log(e);
		} finally {
			uoPopulateStmt.finalize();
		}
		dbConn.close();
		
//		let params = uoPopulateStmt.newBindingParamsArray();  
//		for(ord in noOrder) {  
//		  let bp = params.newBindingParams();  
//		  bp.bindByName("rowId", noOrder[ord].rowid);  
//		  params.addParams(bp);  
//		}
//		
//		
//		try{
//			uoPopulateStmt.bindParameters(params); 
//			
//			uoPopulateStmt.executeAsync({  
//				handleResult: function(aResultSet) {
//					
//				// for (let row = aResultSet.getNextRow();  
//					 // row;  
//					 // row = aResultSet.getNextRow()) {  
//
//				  // let value = row.getResultByName("column_name");  
//				// }  
//					// alert('async save success');
//				},  
//
//				handleError: function(aError) {  
//					console.log("Error: " + aError.message);  
//				},  
//
//				handleCompletion: function(aReason) {  
//					if (aReason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED)  
//					  console.log("Query canceled or aborted!");  
//				}  
//			});  
//		} catch (e) {
//			console.log(e);
//		} finally {
//			uoPopulateStmt.finalize();
//		}
//		
//		dbConn.asyncClose();
	},
	
	historyify: function(groupId, fullString, searchTerms) {
		let file = FileUtils.getFile("ProfD", ["multilookup.sqlite"]);  
		let dbConn = Services.storage.openDatabase(file); // Will also create the file if it does not exist  
	
		var hStmt = dbConn.createStatement("INSERT INTO history (full_string,search_terms,group_id) VALUES(:fullString,:searchTerms,:groupId);");
		hStmt.params.fullString = fullString;
		hStmt.params.searchTerms = searchTerms;
		hStmt.params.groupId = groupId;
		
		try{
			hStmt.executeAsync({  
				handleResult: function(aResultSet) {  
				// for (let row = aResultSet.getNextRow();  
					 // row;  
					 // row = aResultSet.getNextRow()) {  

				  // let value = row.getResultByName("column_name");  
				// }  
					// alert('async save success');
				},  

				handleError: function(aError) {  
					console.log("Error: " + aError.message);  
				},  

				handleCompletion: function(aReason) {  
					if (aReason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED)  
					  console.log("Query canceled or aborted!");  
				}  
			});  
		} catch (e) {
			console.log(e);
		} finally {
			hStmt.finalize();
		}
		
		dbConn.asyncClose();
	}
};