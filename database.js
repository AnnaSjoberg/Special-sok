// database.js
function openDatabase() {
  const DB_NAME = "DogTrainingDB";
  const DB_VERSION = 10;
  const categoryNames = [
    "dog",
    "environment",
    "area",
    "height",
    "kongs_hidden",
    "kongs_found",
    "distractions",
    "notes",
    "date",
  ]; // Add more category names
  const initialOptions = {
    environment: [
      { value: "Skog" },
      { value: "Park" },
      { value: "Stad" },
      { value: "Möblerat rum" },
      { value: "Uthusbyggnad" },
    ],
    area: [{ value: "0-10 m2" }, { value: "10-20 m2" }],
    height: [
      { value: "Hunden når från marken" },
      { value: "Hunden kan själv klättra" },
      { value: "Hunden behöver hjälp" },
    ],
    // ... other categories
  };
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = function (event) {
      const db = event.target.result;

      // Create the combined object store for all categories
      const categoriesStore = db.createObjectStore("categories", {
        keyPath: "name",
      });

      // Add initial categories to the combined object store
      categoryNames.forEach((categoryName) => {
        categoriesStore.add({ name: categoryName });
      });

      // Create separate object stores for category options
      categoryNames.forEach((categoryName) => {
        const categoryStore = db.createObjectStore(categoryName, {
          keyPath: "id",
          autoIncrement: true,
        });

        // Add initial options to the category object store
        const options = initialOptions[categoryName] || [];
        options.forEach((option) => {
          categoryStore.add(option);
        });
      });
      // Create the object store for sessions
      const sessionStore = db.createObjectStore("sessions", {
        keyPath: "id",
        autoIncrement: true,
      });
      // Add the categories as properties to the object store
      categoryNames.forEach((categoryName) => {
        const keyPath = categoryName.replace(/ /g, '_'); // Replace spaces with underscores
        sessionStore.createIndex(keyPath, keyPath, { unique: false });
      });
    };

    request.onsuccess = function (event) {
      resolve(event.target.result);
    };

    request.onerror = function (event) {
      reject(event.target.error);
    };
  });
}

async function fetchCategories(db) {
  return new Promise((resolve, reject) => {
    // Access the object store for the category names
    const transaction = db.transaction("categories", "readonly");
    const categoriesStore = transaction.objectStore("categories");
    const getRequest = categoriesStore.getAll();

    getRequest.onsuccess = function (event) {
      const categoryEntries = event.target.result || [];
      const categories = categoryEntries.map((entry) => entry.name);
      resolve(categories);
    };

    getRequest.onerror = function (event) {
      reject(event.target.error);
    };
  });
}
async function addSessionToDB(db, session) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("sessions", "readwrite");
      const sessionStore = transaction.objectStore("sessions");
        
      const request = sessionStore.add(session);
  
      request.onsuccess = function (event) {
        resolve(event.target.result);
      };
  
      request.onerror = function (event) {
        reject(event.target.error);
      };
    });
  }

function getAllTrainingSessions(db) {
  
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("sessions", "readonly");
      const sessionStore = transaction.objectStore("sessions");
      const queryRequest = sessionStore.openCursor();
      const sessions = [];

      queryRequest.onsuccess = function (event) {
        const cursor = event.target.result;
        if (cursor) {
          sessions.push(cursor.value);
          cursor.continue();
        } else {
          resolve(sessions);
        }
      };

      queryRequest.onerror = function (event) {
        reject("Error querying training sessions");
      };
    });
  
}
async function getSessionsByFilters(db, filters) {
    const allSessions = await getAllTrainingSessions(db);
  
    const filteredSessions = allSessions.filter((session) => {
      return filters.every((filter) => {
        const category = filter.category;
        const option = filter.option;
  
        return session[category] === option;
      });
    });
  
    console.log(filteredSessions.length);
    return filteredSessions;
  }
  
/*
async function getSessionsByFilters(db, filters) {
    const sessions = []; // Array to store fetched sessions
  
    // Open a transaction and access the sessions store
    const transaction = db.transaction("sessions", "readonly");
    const store = transaction.objectStore("sessions");
  
    // Loop through filters in the array
    for (const filter of filters) {
      const category = filter.category;
      const option = filter.option;
      const index = store.index(category);
  
      const range = IDBKeyRange.only(option);
      const cursorRequest = index.openCursor(range);
  
      cursorRequest.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          sessions.push(cursor.value);
          cursor.continue();
        }
      };
    }
 console.log(sessions.length);
    return sessions;
  }
 
  async function getSessionsByFilters(db, filters) {
    const transaction = db.transaction("sessions", "readonly");
    const store = transaction.objectStore("sessions");
    
    let sessions=[];
    // Create an initial range that includes all sessions
    let range = IDBKeyRange.lowerBound(0);
  
    // Apply filters one by one
    for (const filter of filters) {
      const category = filter.category;
      const option = filter.option;
      const index = store.index(category);
      console.log('inside filter of Filters')
      // Update the range with the new filter
      range = IDBKeyRange.bound(option, option);
  
      // Open a cursor for the updated range
      const cursorRequest = index.openCursor(range);
      
      const filteredSessions = [];
      
      cursorRequest.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          filteredSessions.push(cursor.value);
          cursor.continue();
        }
      };
      
      // Wait for the cursor request to complete
      await new Promise((resolve) => {
        cursorRequest.onsuccess = (event) => {
          resolve();
        };
      });
      
      // Update sessions with the filtered results
      console.log(filteredSessions.length +'filtered');
      sessions = filteredSessions;
    }
    
    console.log(sessions.length +'sessions');
    return sessions;
  }
   
  async function getSessionsByFilters(db, filters) {
    const transaction = db.transaction("sessions", "readonly");
    const store = transaction.objectStore("sessions");
  
    let sessions = []; // Initialize an empty array to store fetched sessions
  
    // Check if any filters are present
    if (filters.length === 0) {
      const cursorRequest = store.openCursor();
  
      cursorRequest.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          sessions.push(cursor.value);
          cursor.continue();
        }
      };
  
      // Wait for the cursor request to complete
      await new Promise((resolve) => {
        cursorRequest.onsuccess = (event) => {
          resolve();
        };
      });
    } else {
      // Apply filters one by one
      for (const filter of filters) {
        const category = filter.category;
        const option = filter.option;
        const index = store.index(category);
  
        // Create an initial range that includes all sessions
        let range = IDBKeyRange.lowerBound(0);
  
        // Update the range with the new filter
        range = IDBKeyRange.bound(option, option);
  
        // Open a cursor for the updated range
        const cursorRequest = index.openCursor(range);
  
        const filteredSessions = [];
  
        cursorRequest.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            filteredSessions.push(cursor.value);
            cursor.continue();
          }
        };
  
        // Wait for the cursor request to complete
        await new Promise((resolve) => {
          cursorRequest.onsuccess = (event) => {
            resolve();
          };
        });
  
        // Merge the filteredSessions into the sessions array
        sessions = sessions.concat(filteredSessions);
      }
    }
  
    console.log(sessions.length);
    return sessions;
  }
 
  async function getSessionsByFilters(db, filters) {
    const transaction = db.transaction("sessions", "readonly");
    const store = transaction.objectStore("sessions");
  
    let sessions = [];
  
    // Check if any filters are present
    if (filters.length === 0) {
      const cursorRequest = store.openCursor();
  
      cursorRequest.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          sessions.push(cursor.value);
          cursor.continue();
        }
      };
  
      // Wait for the cursor request to complete
      await new Promise((resolve) => {
        cursorRequest.onsuccess = (event) => {
          resolve();
        };
      });
    } else {
      // Apply filters one by one
      for (const filter of filters) {
        const category = filter.category;
        const option = filter.option;
        const index = store.index(category);
  
        const range = IDBKeyRange.only(option);
  
        // Open a cursor for the range
        const cursorRequest = index.openCursor(range);
  
        await new Promise((resolve) => {
          cursorRequest.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
              sessions.push(cursor.value);
              cursor.continue();
            } else {
              resolve(); // Resolve the Promise when the cursor is done
            }
          };
        });
      }
    }
  
    console.log(sessions.length);
    return sessions;
  }
  */



async function fetchOptions(db, categoryName) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(categoryName, "readonly");
    const categoryNameStore = transaction.objectStore(categoryName);
    const getRequest = categoryNameStore.getAll();

    getRequest.onsuccess = function (event) {
      const options = event.target.result.map((entry) => entry.value);
      
      resolve(options);
    };

    getRequest.onerror = function (event) {
      reject(event.target.error);
    };
  });
}


async function saveNewOptionToDatabase(categoryName, option) {
  // Save the new option to the database
  try {
    const db = await openDatabase(); // Open the database
    const transaction = db.transaction(categoryName, "readwrite");
    const categoryStore = transaction.objectStore(categoryName);

    // Create an object with the option value
    const optionObject = { value: option };

    // Add the option to the category's object store
    const request = categoryStore.add(optionObject);

    return new Promise((resolve, reject) => {
      request.onsuccess = function (event) {
        resolve();
      };

      request.onerror = function (event) {
        reject(event.target.error);
      };
    });
  } catch (error) {
    console.error("Error adding option to category", error);
    throw error;
  }
}
