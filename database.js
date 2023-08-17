// database.js
function openDatabase() {
  const DB_NAME = "DogTrainingDB";
  const DB_VERSION = 12;
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
  const distractionAttributes = ["01_type", "02_sessionID"];
  const initialDistractionOptions = {
    "01_type": [],
    "02_sessionID": [],
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = function (event) {
      const db = event.target.result;

      // Create the combined object store for all sessionAttributes
      const sessionAttributesStore = db.createObjectStore("sessionAttributes", {
        keyPath: "name",
      });

      // Add initial sessionAttributes to the combined object store
      sessionAttributes.forEach((sessionAttribute) => {
        sessionAttributesStore.add({ name: sessionAttribute });
      });

      // Create separate object stores for sessionAttributes options
      sessionAttributes.forEach((sessionAttribute) => {
        const sessionAttributeStore = db.createObjectStore(sessionAttribute, {
          keyPath: "id",
          autoIncrement: true,
        });

        // Add initial session options to the category object store
        const sessionOptions = initialSessionOptions[sessionAttribute] || [];
        sessionOptions.forEach((sessionOption) => {
          sessionAttributeStore.add(sessionOption);
        });
      });

      // Create the combined object store for all objectAttributes
      const objectAttributesStore = db.createObjectStore("objectAttributes", {
        keyPath: "name",
      });

      // Add initial objectAttributes to the combined object store
      objectAttributes.forEach((objectAttribute) => {
        objectAttributesStore.add({ name: objectAttribute });
      });

      // Create separate object stores for objectAttributes options
      objectAttributes.forEach((objectAttribute) => {
        const objectAttributeStore = db.createObjectStore(objectAttribute, {
          keyPath: "id",
          autoIncrement: true,
        });

        // Add initial object options to the category object store
        const objectOptions = initialObjectOptions[objectAttribute] || [];
        objectOptions.forEach((objectOption) => {
          objectAttributeStore.add(objectOption);
        });
      });

      // Create the combined object store for all distractionAttributes
      const distractionAttributesStore = db.createObjectStore("distractionAttributes", {
        keyPath: "name",
      });

      // Add initial distractionAttributes to the combined object store
      distractionAttributes.forEach((distractionAttribute) => {
        distractionAttributesStore.add({ name: distractionAttribute });
      });

      // Create separate object stores for distractionAttributes options
      distractionAttributes.forEach((distractionAttribute) => {
        const distractionAttributeStore = db.createObjectStore(distractionAttribute, {
          keyPath: "id",
          autoIncrement: true,
        });

        // Add initial distraction options to the attribute object store
        const distractionOptions = initialDistractionOptions[distractionAttribute] || [];
        distractionOptions.forEach((distractionOption) => {
          distractionAttributeStore.add(distractionOption);
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

async function fetchCategories(db, objectStoreName) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(objectStoreName, "readonly");
    const objectAttributesStore = transaction.objectStore(objectStoreName);
    const getRequest = objectAttributesStore.getAll();

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


async function fetchOptions(db, attribute) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(attribute, "readonly");
    const objectStore = transaction.objectStore(attribute);
    const getRequest = objectStore.getAll();

    getRequest.onsuccess = function (event) {
      const options = event.target.result.map((entry) => entry.value);
      resolve(options);
    };

    getRequest.onerror = function (event) {
      reject(event.target.error);
    };
  });
}


async function addSessionToDB(db, session, objects, distractions) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["sessions", "objects", "distractions"], "readwrite");
    const sessionStore = transaction.objectStore("sessions");
    const objectStore = transaction.objectStore("objects");
    const distractionStore = transaction.objectStore("distractions");

    const sessionRequest = sessionStore.add(session);

    sessionRequest.onsuccess = async function (event) {
      const sessionID = event.target.result;

      // Save sessionID for objects and distractions
      objects.forEach(object => {
        object.sessionID = sessionID;
      });
      distractions.forEach(distraction => {
        distraction.sessionID = sessionID;
      });

      // Save objects and distractions in their respective stores
      const objectSavePromises = objects.map(object => objectStore.add(object));
      const distractionSavePromises = distractions.map(distraction => distractionStore.add(distraction));

      const allSavePromises = [...objectSavePromises, ...distractionSavePromises];

      Promise.all(allSavePromises)
        .then(() => resolve(sessionID))
        .catch(error => reject(error));
    };

    sessionRequest.onerror = function (event) {
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
