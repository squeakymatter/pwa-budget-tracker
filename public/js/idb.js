// idb.js handles IndexedDB functionality for the app

// create variable to store connected db object when connection iscomplete
let db;
//create `request` variable to act as event listener for db.
//event listener is created when connect to db is opened using indexedDB.open() method.
const request = indexedDB.open('budget_tracker', 1);

//container that stores data in IndexedDB database system is called an object store. (By comparison, in SQL, tables hold data. In MongoDB, collections hold data.)
// this event will emit if the database version changes (nonexistant to v1, v1 to v2, etc.)
request.onupgradeneeded = function (event) {
  // save a reference to the database
  const db = event.target.result;
  // create an object store (table) called `new_transaction`, set it to have an auto incrementing primary key of sorts. When event executes, store locally scoped connection to the db and use .createObjectStore() method to create the object store that will hold transaction data.
  db.createObjectStore('new_transaction', { autoIncrement: true });
};

// onsuccess event hander: when connection to db is finalized, store resutling db object to the global variable `db`.
request.onsuccess = function (event) {
  // when db is successfully created with its object store (from onupgradedneeded event above) or simply established a connection, save reference to db in global variable
  db = event.target.result;

  // check if app is online, if yes run uploadTransaction() function to send all local db data to api
  if (navigator.onLine) {
    // we haven't created this yet, but we will soon, so let's comment it out for now
    uploadTransaction();
  }
};

request.onerror = function (event) {
  // log error here
  console.log(event.target.errorCode);
};

// This function will be executed if we attempt to submit a new transaction.
function saveRecord(record) {
  // Explicitly open a transaction (i.e., temp connection to db to help IndexedDB database maintain accurate reading of data it stores.
  const transaction = db.transaction(['new_transaction'], 'readwrite');

  // After transaction opened, directly access `new_transaction` object store where data will get added.
  const transactionObjectStore = transaction.objectStore('new_transaction');

  // Add record to your store with add method
  transactionObjectStore.add(record);
}

function uploadTransaction() {
  // open a transaction on your db
  const transaction = db.transaction(['new_transaction'], 'readwrite');

  // access your object store
  const transactionObjectStore = transaction.objectStore('new_transaction');

  // get all records from store and set to a variable
  const getAll = transactionObjectStore.getAll();

  // upon a successful .getAll() execution, run this function
  getAll.onsuccess = function () {
    // if there was data in indexedDb's store, let's send it to the api server
    if (getAll.result.length > 0) {
      fetch('/api/transaction', {
        method: 'POST',
        body: JSON.stringify(getAll.result),
        headers: {
          Accept: 'application/json, text/plain, */*',
          'Content-Type': 'application/json',
        },
      })
        .then((response) => response.json())
        .then((serverResponse) => {
          if (serverResponse.message) {
            throw new Error(serverResponse);
          }
          // open one more transaction
          const transaction = db.transaction(['new_transaction'], 'readwrite');
          // access the new_transaction object store
          const transactionObjectStore = transaction.objectStore(
            'new_transaction'
          );
          // clear all items in your store
          transactionObjectStore.clear();

          alert('All saved transactions has been submitted!');
        })
        .catch((err) => {
          console.log(err);
        });
    }
  };
}

// listen for app coming back online.
// once online, execute uploadTransaction function.
window.addEventListener('online', uploadTransaction);
