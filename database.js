// database.js
function openDatabase() {
  const DB_NAME = "DogTrainingDB";
  const DB_VERSION = 11;
  const categoryNames = [
    "01_date",
    "02_dog",
    "03_environment",
    "04_area",
    "05_height",
    "06_distractions",
    "07_kongs_hidden",
    "08_kongs_found",
    "09_notes",
  ]; // Add more category names
  const initialOptions = {
    "01_date": [], // Add options for date
    "02_dog": [], // Add options for dog
    "03_environment": [
      { value: "Skog" },
      { value: "Park" },
      { value: "Stad" },
      { value: "Möblerat rum" },
      { value: "Uthusbyggnad" },
    ],
    "04_area": [{ value: "0-10 m2" }, { value: "10-20 m2" }],
    "05_height": [
      { value: "Hunden når från marken" },
      { value: "Hunden kan själv klättra" },
      { value: "Hunden behöver hjälp" },
    ],
    "06_distractions" : [],
    "07_kongs_hidden" : [],
    "08_kongs_found" : [],
    "09_notes" : [],

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
      // Modify category names to remove numeric prefixes
const keyPaths = categoryNames.map((category) => category.replace(/^\d+_/g, ''));

// Use the modified key paths in the createIndex method
keyPaths.forEach((keyPath) => {
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
