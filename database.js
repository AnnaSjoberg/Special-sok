// database.js
function openDatabase() {
  const DB_NAME = "DogTrainingDB";
  const DB_VERSION = 11;
  const sessionAttributes = [
    "01_date",
    "02_dog",
    "03_environment",
    "04_area",
    "05_waiting_time",
    "06_notes",
  ];
  //initial options for sessions
  const initialSessionOptions = {
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
    "05_waiting_time": [],
    "06_notes": [],
  };
  // For objects
  const objectAttributes = ["01_size", "02_height", "03_found", "04_sessionID"];

  const initialObjectOptions = {
    "01_size": [],
    "02_height": [
      { value: "Hunden når från marken" },
      { value: "Hunden kan själv klättra" },
      { value: "Hunden behöver hjälp" },
    ],
    "03_found": [{ value: true }, { value: false }],
    "04_sessionID": [],
  };

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = function (event) {
      const db = event.target.result;

      // Create the combined object store for all sessionAttributes
      const sessionAttributesStore = db.createObjectStore("sessionAttributes", {
        keyPath: "name",
      });

      // Add initial categories to the combined object store
      sessionAttributes.forEach((sessionAttribute) => {
        sessionAttributesStore.add({ name: sessionAttribute });
      });

      // Create separate object stores for category options
      sessionAttributes.forEach((sessionAttribute) => {
        const sessionAttributeStore = db.createObjectStore(sessionAttribute, {
          keyPath: "id",
          autoIncrement: true,
        });

        // Add initial options to the category object store
        const sessionOptions = initialSessionOptions[sessionAttribute] || [];
        sessionOptions.forEach((sessionOption) => {
          sessionAttributeStore.add(sessionOption);
        });
      });

      // Create the combined object store for all objectAttributes
      const objectAttributesStore = db.createObjectStore("objectAttributes", {
        keyPath: "name",
      });

      // Add initial categories to the combined object store
      objectAttributes.forEach((objectAttribute) => {
        objectAttributesStore.add({ name: objectAttribute });
      });

      // Create separate object stores for category options
      objectAttributes.forEach((objectAttribute) => {
        const objectAttributeStore = db.createObjectStore(objectAttribute, {
          keyPath: "id",
          autoIncrement: true,
        });

        // Add initial options to the category object store
        const objectOptions = initialObjectOptions[objectAttribute] || [];
        objectOptions.forEach((objectOption) => {
          objectAttributeStore.add(objectOption);
        });
      });

      // Create the object store for sessions
      const sessionStore = db.createObjectStore("sessions", {
        keyPath: "id",
        autoIncrement: true,
      });
      // Modify category names to remove numeric prefixes
      const sessionKeyPaths = sessionAttributes.map((category) =>
        category.replace(/^\d+_/g, "")
      );

      // Use the modified key paths in the createIndex method
      sessionKeyPaths.forEach((keyPath) => {
        sessionStore.createIndex(keyPath, keyPath, { unique: false });
      });
      // Create the object store for objects
      const objectStore = db.createObjectStore("objects", {
        keyPath: "id",
        autoIncrement: true,
      });
      // Modify category names to remove numeric prefixes
      const objectKeyPaths = objectAttributes.map((category) =>
        category.replace(/^\d+_/g, "")
      );

      // Use the modified key paths in the createIndex method
      objectKeyPaths.forEach((keyPath) => {
        objectStore.createIndex(keyPath, keyPath, { unique: false });
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
    const transaction = db.transaction("sessionAttributes", "readonly");
    const sessionAttributesStore = transaction.objectStore("sessionAttributes");
    const getRequest = sessionAttributesStore.getAll();

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

async function fetchOptions(db, sessionAttribute) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("sessionAttribute", "readonly");
    const sessionAttributeStore = transaction.objectStore(sessionAttribute);
    const getRequest = sessionAttributeStore.getAll();

    getRequest.onsuccess = function (event) {
      const options = event.target.result.map((entry) => entry.value);

      resolve(options);
    };

    getRequest.onerror = function (event) {
      reject(event.target.error);
    };
  });
}

async function saveNewOptionToDatabase(sessionAttribute, option) {
  // Save the new option to the database
  try {
    const db = await openDatabase(); // Open the database
    const transaction = db.transaction("sessionAttribute", "readwrite");
    const sessionAttributeStore = transaction.objectStore(sessionAttribute);

    // Create an object with the option value
    const optionObject = { value: option };

    // Add the option to the category's object store
    const request = sessionAttributeStore.add(optionObject);

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
