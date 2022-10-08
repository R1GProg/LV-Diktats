DiktifySocket -> LocalWorkspaceInterface -> LocalWorkspaceDatabase -> BrowserDatabase -> IndexedDB
						|
						|-> @shared/processing -> @shared/diff-engine

DiktifySocket - gets the request and sends the data to the server or LocalWorkspaceInterface
LocalWorkspaceInterface - Gets the data to be processed, processes the data with @shared/processing,
						  and sends the updated data to LocalWorkspaceDatabase
LocalWorkspaceDatabase - Gets the updated data, splits off mistakes from submissions, sends the update
						  requests to BrowserDatabase
BrowserDatabase - Pretty much just a promise wrapper for IndexedDB