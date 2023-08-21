//app-logic.js

document.addEventListener("DOMContentLoaded", async function () {
  const db = await openDatabase(); // Open the database

  const logLink = document.getElementById("logLink");
  const viewLink = document.getElementById("viewLink");
  const loggingSection = document.getElementById("loggingSection");
  const viewingSection = document.getElementById("viewingSection");
  const logConfirmationContainer = document.querySelector(".log-confirmation");
  const loggingForm = document.getElementById("logging-form");
  
  createObjectModal(db);
  
  logLink.addEventListener("click", function () {
    loggingSection.style.display = "block";
    viewingSection.style.display = "none";
   // clearLogFormContainer();
    createObjectModal(db);
    console.log('click click');
  });
  

  viewLink.addEventListener("click", function () {
    loggingSection.style.display = "none";
    viewingSection.style.display = "block";

    initializeView(db);
  });
});
async function createObjectModal(db) {
  const modal = document.getElementById("objectModal");
  const submitButton = document.getElementById("submit-num-objects");
  const numObjectsInput = document.getElementById("num-objects-modal");
  const loggingSection = document.getElementById("loggingSection");

  modal.style.display = "block";

  // Handle the submit button
  submitButton.addEventListener("click", async () => {
    const numObjectsValue = parseInt(numObjectsInput.value, 10) || 1;

    // Close the modal and show the logging section
    modal.style.display = "none";
    loggingSection.style.display = "block";

    // Initialize the logging section with the specified number of objects
    initializeLog(db, numObjectsValue);
  });
}
async function initializeLog(db, numObjectsValue) {
  try {
    
      // Fetch all categories from the database
      const sessionCategories = await fetchCategories(db, "sessionAttributes");
      const objectCategories = await fetchCategories(db, "objectAttributes");
      const distractionCategories = await fetchCategories(db,"distractionAttributes");

      const logFormContainer = document.querySelector(".log-form");
      const logConfirmationContainer =document.querySelector(".log-confirmation");
      const loggingForm = document.querySelector("#logging-form");
      
      clearContainer(logConfirmationContainer);
      clearLogFormContainer();
    loggingForm.reset();
    const dropdowns = loggingForm.querySelectorAll("select");
    dropdowns.forEach((dropdown) => {
      dropdown.selectedIndex = 0; // Reset to the placeholder option
    });
      
      const sessionContainer = document.querySelector(".session-container");
      const objectContainer = document.querySelector(".object-container");
      const distractionContainer = document.querySelector(".distraction-container");
      const noteContainer = document.querySelector(".note-container");
      
      loggingForm.appendChild(sessionContainer);
      loggingForm.appendChild(noteContainer);
      loggingForm.appendChild(objectContainer);
     
      
      const dropdownPromises = [];

      let noteCategory;
      sessionCategories.forEach(async (category) => {
        if (category.includes("notes")) {
          noteCategory = category;
        } else {
          await createLogDropdowns(db, category, sessionContainer);
        }
      });
    
      for (let i = 0; i < numObjectsValue; i++) {
        const objectDiv = createObjectDiv(db, objectCategories, i);
        objectContainer.appendChild(objectDiv);
      }
      

      console.log(loggingForm);
      
      distractionCategories.forEach(async (category) => {
        
        if (category.includes("type")) {
          
          
          await initializeDistractions(db, distractionContainer, category);
          console.log(distractionContainer);
          if (distractionContainer) {
            console.log(loggingForm);
            loggingForm.appendChild(distractionContainer);
            console.log(distractionContainer);
            console.log(loggingForm);
          }
        }
      });

      if (noteCategory) {
        const notesContainer = createNotesContainer();
        noteContainer.appendChild(notesContainer);
      }
      //loggingForm.appendChild(noteContainer);

      // Wait for all dropdowns to be created before appending the button
      Promise.all(dropdownPromises).then((dropdowns) => {
        dropdowns.forEach((dropdown) => {
          sessionContainer.appendChild(dropdown);
        });
        const buttonDiv = document.createElement("div");
        buttonDiv.className = "button-div";
        const saveSessionButton = document.createElement("button");
        saveSessionButton.classList.add("btn", "btn-success", "log-save");

        saveSessionButton.textContent = "Spara träningspass";
        saveSessionButton.addEventListener("click", () => {
          // Extract selected options from dropdowns and checkboxes
          const objectData = [];
          const objectDivs = document.querySelectorAll(".object-div");
          objectDivs.forEach((objectDiv, i) => {
            const object = {};
            objectCategories.forEach((category) => {
              const catString = removePrefix(category);
              const input = objectDiv.querySelector(`#${catString}${i}`);
              const inputValue = input ? input.value : "";
              object[category] = inputValue;
            });
            objectData.push(object);
          });

          const checkedDistractions = distractionContainer.querySelectorAll(
            'input[type="checkbox"]:checked'
          );
          const distractionData = Array.from(checkedDistractions).map(
            (checkbox) => checkbox.value
          );

          validateLoggingForm(
            db,
            sessionCategories,
            objectData,
            distractionData
          );
        });

        const clearButton = document.createElement("button");
        clearButton.classList.add("btn", "btn-secondary", "log-clear");
        clearButton.textContent = "Rensa formulär";
        clearButton.addEventListener("click", () => {
          console.log('click');
         createObjectModal(db);
        });

        buttonDiv.appendChild(saveSessionButton);
        buttonDiv.appendChild(clearButton);

        logFormContainer.appendChild(buttonDiv);
        logFormContainer.appendChild(logConfirmationContainer);
      });
    
  } catch (error) {
    console.error("Error initializing dropdown menus", error);
  }
}

async function createLogDropdowns(db, category, sessionContainer) {
  const categoryContainer = document.createElement("div");
  const catString = removePrefix(category);
  categoryContainer.className = `${catString}Container`;

  if (category.includes("date")) {
    const dateChooser = document.createElement("input");
    dateChooser.className = "date-chooser";
    dateChooser.type = "date";
    dateChooser.id = catString;
    categoryContainer.appendChild(dateChooser);
  } else if (category.includes("notes")) {
    const noteArea = document.createElement("textarea");
    noteArea.rows = 4;
    noteArea.placeholder = "Anteckningar (valfri)";
    noteArea.className = "note-area";
    noteArea.id = catString;
    categoryContainer.appendChild(noteArea);
  } else {
    const logDropdown = document.createElement("select");
    logDropdown.className = "select-logDropdown";
    logDropdown.id = catString; // Set the id of the logDropdown to the category name

    const placeholderOption = document.createElement("option");
    // placeholderOption.value = "";
    placeholderOption.textContent = beautifyLabel(category);
    placeholderOption.disabled = true;
    placeholderOption.selected = true;
    logDropdown.appendChild(placeholderOption);

    initializeDropdownOptions(db, logDropdown, category);

    const addButton = createAddNewButton(
      db,
      category,
      logDropdown,
      categoryContainer
    );
    categoryContainer.appendChild(logDropdown);
    categoryContainer.appendChild(addButton);
  }
  sessionContainer.appendChild(categoryContainer);
}
function createObjectDiv(db, objectCategories, index) {
  // Create a div for an object and initialize the dropdowns
  const indObjectDiv = document.createElement("div");
  indObjectDiv.className = "object-div";
  indObjectDiv.id = `ind-object-div${index}`;

  const label = document.createElement("label");
  label.textContent = `Gömma ${index + 1}:`;

  indObjectDiv.appendChild(label);

  objectCategories.forEach((objectCategory) => {
    if (!objectCategory.includes("sessionID")) {
      const catString = removePrefix(objectCategory);
      const indCatDiv = document.createElement("div");
      const objectDropdown = document.createElement("select");
      objectDropdown.id = catString + index;
      indCatDiv.appendChild(objectDropdown);

      const placeholderOption = document.createElement("option");
      placeholderOption.value = "";
      placeholderOption.textContent = beautifyLabel(objectCategory);
      placeholderOption.disabled = true;
      placeholderOption.selected = true;
      objectDropdown.appendChild(placeholderOption);

      initializeDropdownOptions(db, objectDropdown, objectCategory);

      if (!objectCategory.includes("found")) {
        const addButton = createAddNewButton(
          db,
          objectCategory,
          objectDropdown,
          indCatDiv
        );
        indCatDiv.appendChild(addButton);
      }

      indObjectDiv.appendChild(indCatDiv);
    }
  });

  return indObjectDiv;
}

async function initializeDistractions(db, distractionContainer, category) {
  try {
    const options = await fetchOptions(db, category); // Fetch options from indexedDB
console.log(distractionContainer);
    if (distractionContainer) {
      distractionContainer.innerHTML="";
      console.log('if');
      console.log(distractionContainer);
    }

    const addButton = createAddNewButton(
      db,
      category,
      null,
      distractionContainer
    );
    distractionContainer.appendChild(addButton);

    options.forEach((option, index) => {
      const checkboxContainer = document.createElement("div");

      const checkboxLabel = document.createElement("label");
      checkboxLabel.classList.add("checkbox-label");

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = option;
      checkbox.id = `distraction-${option}`;

      const checkboxText = document.createTextNode(option);

      checkboxLabel.appendChild(checkbox);
      checkboxLabel.appendChild(checkboxText);
      checkboxContainer.appendChild(checkboxLabel);

      distractionContainer.appendChild(checkboxContainer);
    });
    return distractionContainer;
  } catch (error) {
    console.error("Error initializing distractions", error);
  }
}
function createNotesContainer() {
  const noteContainer = document.createElement("div");
  noteContainer.className = "note-container";

  const notesTextArea = document.createElement("textarea");
  notesTextArea.rows = 4;
  notesTextArea.placeholder = "Anteckningar (valfri)";
  notesTextArea.className = "note-area";
  noteContainer.appendChild(notesTextArea);

  return noteContainer;
}
function createAddNewButton(
  db,
  category,
  categoryDropdown = null,
  categoryContainer
) {
  const addButton = document.createElement("button");
  addButton.classList.add("btn", "btn-warning", "btn-sm");
  addButton.type = "button";
  addButton.textContent = "Lägg till nytt";

  addButton.addEventListener("click", () => {
    showAddNewInput(db, category, categoryDropdown, categoryContainer);
  });

  return addButton;
}

async function initializeDropdownOptions(db, dropdown, category) {
  try {
    const options = await fetchOptions(db, category); // Fetch options from indexedDB

    options.forEach((option) => {
      let optionString = String(option);

      const optionElement = document.createElement("option");
      if (option === true || option === false) {
        optionString = translate(optionString);
      }
      optionElement.value = option;
      optionElement.textContent = optionString;
      dropdown.appendChild(optionElement);
    });
  } catch (error) {
    console.error("Error initializing dropdown options", error);
  }
}
async function showAddNewInput(
  db,
  category,
  categoryDropdown = null,
  categoryContainer
) {
  const catString = removePrefix(category);

  const oldInputContainer = document.querySelector(".input-container");
  if (oldInputContainer) {
    oldInputContainer.remove();
  }

  const inputContainer = document.createElement("div");
  inputContainer.className = "input-container";

  const inputField = document.createElement("input");
  inputField.type = "text";
  inputField.placeholder = "Skriv in nytt alternativ";

  const saveButton = document.createElement("button");
  saveButton.type = "button";
  saveButton.classList.add("btn", "btn-danger", "btn-sm");
  saveButton.textContent = "Spara";

  inputContainer.appendChild(inputField);
  inputContainer.appendChild(saveButton);

  //const categoryContainer = document.querySelector(`.${catString}Container`);
  categoryContainer.appendChild(inputContainer);

  saveButton.addEventListener("click", async () => {
    const newOptionValue = inputField.value.trim();

    if (newOptionValue !== "") {
      // Save the new option to the database (implement this function)
      await saveNewOptionToDatabase(category, newOptionValue);

      if (categoryDropdown) {
        // Add new option directly to the dropdown
        const optionElement = document.createElement("option");
        optionElement.value = newOptionValue;
        optionElement.textContent = newOptionValue;
        categoryDropdown.appendChild(optionElement);
        optionElement.selected = true;
      } else {
        const checkboxContainer = document.createElement("div");

        const checkboxLabel = document.createElement("label");
        checkboxLabel.classList.add("checkbox-label");

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = newOptionValue;
        checkbox.id = `distraction-${newOptionValue}`;

        const checkboxText = document.createTextNode(newOptionValue);

        checkboxLabel.appendChild(checkbox);
        checkboxLabel.appendChild(checkboxText);
        checkboxContainer.appendChild(checkboxLabel);

        // Tick the checkbox right away
        checkbox.checked = true;

        // Append the new container to the distractionContainer
        categoryContainer.appendChild(checkboxContainer);
      }

      // Clear the input field
      inputField.value = "";
      inputContainer.remove();
    }
  });
}
async function validateLoggingForm(
  db,
  categories,
  objectData,
  distractionData
) {
  const formData = {};
  const logConfirmationContainer = document.querySelector(".log-confirmation");
  const confirmation = document.createElement("h4");

  clearContainer(logConfirmationContainer);

  logConfirmationContainer.appendChild(confirmation);

  try {
    for (const category of categories) {
      const catString = removePrefix(category);
      const option = document.querySelector(`#${catString}`);
      if (category.includes("notes")) {
        formData[category] = option ? option.value : "";
      } else if (!option || option.value === "") {
        confirmation.textContent = `Vänligen fyll i alla obligatoriska fält.`;
        return;
      } else {
        formData[category] = option.value;
      }
    }

    // Validate object data
    const validObjectData = objectData.every((object) => {
      //
      return Object.values(object).every((value) => {
        if (typeof value === "string") {
          return value.trim() !== ""; // Check for non-empty string after trimming whitespace
        }
        return value !== undefined && value !== null; // Check for non-empty non-string values
      });
    });
    if (!validObjectData) {
      confirmation.textContent = `Vänligen fyll i alla obligatoriska fält för objekten.`;
      return;
    }

    await addSessionToDB(db, formData, objectData, distractionData);

    confirmation.textContent = "Träningspass sparat!";
  } catch (error) {
    console.error("Error saving session:", error);
    const errorDiv = document.createElement("div");
    const errorText = document.createElement("h4");
    errorText.textContent = "An error occurred while saving the session.";
    errorDiv.appendChild(errorText);
    const logFormContainer = document.querySelector(".log-form");
    logFormContainer.appendChild(errorDiv);
  }
}

async function initializeView(db) {
  try {
    const sessionCategories = await fetchCategories(db, "sessionAttributes");
    const objectCategories = await fetchCategories(db, "objectAttributes");
    const distractionCategories = await fetchCategories(
      db,
      "distractionAttributes"
    );

    const filterContainer = document.querySelector(".filter-container");
    const displayContainer = document.querySelector(".view-sessions");

    clearContainer(filterContainer);
    clearContainer(displayContainer);

    const viewCategoryContainers = [];

    // Loop through categories and create dropdowns
    sessionCategories.forEach(async (category) => {
      if (!category.includes("date") && !category.includes("notes")) {
        const viewCategoryContainer = createViewDropdowns(
          db,
          category,
          displayContainer
        );
        filterContainer.appendChild(viewCategoryContainer);
        viewCategoryContainers.push(viewCategoryContainer);
      }
    });

    const filterButton = document.createElement("button");
    filterButton.classList.add("btn", "btn-primary");
    filterButton.textContent = "Filtrera och visa";
    filterContainer.appendChild(filterButton);
    filterButton.addEventListener("click", async () => {
      //const filters = collectFilters();
      const filters = await collectFilters(viewCategoryContainers);

      fetchAndDisplayFilteredSessions(db, filters);
    });
  } catch (error) {
    console.error("Error initializing viewing", error);
  }
}
function createViewDropdowns(db, category, displayContainer) {
  const catString = removePrefix(category);
  const viewCategoryContainer = document.createElement("div");
  viewCategoryContainer.className = `view-${catString}-container`;
  viewCategoryContainer.setAttribute("data-category", category); // Set the data-category attribute

  const viewDropdown = document.createElement("select");
  viewDropdown.className = "select-viewDropdown";
  viewDropdown.id = catString; // Set the id of the viewDropdown to the category name

  const placeholderOption = document.createElement("option");
  // placeholderOption.value = "";
  placeholderOption.textContent = beautifyLabel(category);
  placeholderOption.disabled = true;
  placeholderOption.selected = true;
  viewDropdown.appendChild(placeholderOption);

  viewCategoryContainer.appendChild(viewDropdown);

  initializeDropdownOptions(db, viewDropdown, category);

  return viewCategoryContainer;
}

async function collectFilters(viewCategoryContainers) {
  const filters = [];

  viewCategoryContainers.forEach((container) => {
    const dropdown = container.querySelector(".select-viewDropdown");
    const dropdownId = dropdown.id;
    const selectedOption = dropdown.value;
    const category = container.getAttribute("data-category");
    const placeholderOption = dropdown.querySelector("option[disabled]"); // Get the disabled placeholder option

    if (selectedOption && selectedOption !== placeholderOption.value) {
      filters.push({ category, option: selectedOption });
    }
  });

  return filters;
}
async function fetchAndDisplayFilteredSessions(db, filters) {
  try {
    const sessions = await getCombinedSessionsByFilters(db, filters); // Fetch sessions based on filters

    displaySessions(sessions, filters);
  } catch (error) {
    console.error("Error fetching and displaying filtered sessions", error);
  }
}
function displaySessions(sessions, filters) {
  const displayContainer = document.querySelector(".view-sessions");
  clearContainer(displayContainer);

  const sessionsTable = document.createElement("table");
  sessionsTable.classList.add(
    "table",
    "table-striped",
    "table-sm",
    "sessions-table"
  );
  displayContainer.appendChild(sessionsTable);

  const tableHeadersRow = document.createElement("tr");
  sessionsTable.appendChild(tableHeadersRow);

  const columnsToDisplay = new Set();
  let showMore = true;
  let hasDate = false;
  let hasDog = false;

  for (const session of sessions) {
    if ("01_date" in session) {
      columnsToDisplay.add("01_date");
      hasDate = true;
    }
    if ("02_dog" in session) {
      columnsToDisplay.add("02_dog");
      hasDog = true;
    }
  }
  if (!hasDate && !hasDog) {
    showMore = false;
  }

  for (const filter of filters) {
    const category = filter.category;
    if (!category.includes("date") && !category.includes("dog")) {
      columnsToDisplay.add(category);
    }
  }

  for (const category of columnsToDisplay) {
    const header = document.createElement("th");
    header.textContent = beautifyLabel(category);
    tableHeadersRow.appendChild(header);
  }

  sessions.forEach((session) => {
    const tableRow = document.createElement("tr");
    tableRow.setAttribute("data-session-id", session.id);

    for (const category of columnsToDisplay) {
      const tableCell = document.createElement("td");
      tableCell.textContent = session[category] || "";
      tableRow.appendChild(tableCell);
    }

    if (showMore) {
      const showMoreCell = document.createElement("td");
      const showMoreButton = document.createElement("button");
      showMoreButton.textContent = "Visa mer";
      showMoreButton.classList.add(
        "btn",
        "btn-sm",
        "btn-info",
        "show-more-button"
      );
      showMoreButton.addEventListener("click", () => {
       
        populateModal(session);
      });
      showMoreCell.appendChild(showMoreButton);
      tableRow.appendChild(showMoreCell);
    }

    sessionsTable.appendChild(tableRow);
  });
}
function populateModal(session) {
  const modal = document.querySelector("#viewModal");
  const closeBtn = document.querySelector(".btn-close");
  const modalContainer = document.querySelector(".modal-container");
  const modalTitle = document.querySelector(".modal-title");

  modalContainer.innerHTML = "";
  modalTitle.innerHTML = "";

  for (const category in session) {
    if (Array.isArray(session[category]) && session[category].length === 0) {
      continue; // Skip creating <ul> and <li> elements for empty array
    }
    if (category.includes("date") || category.includes("dog")) {
      modalTitle.textContent += `${session[category]} \u00A0\u00A0\u00A0\u00A0`;
    } else if (category !== "id" && session[category] !== "") {
      const categoryDiv = document.createElement("div");
      const categoryLabel = document.createElement("label");
      categoryLabel.className = "category-label";
      categoryLabel.textContent = beautifyLabel(category);
      const ul = document.createElement("ul");
      ul.className = `${category}-ul`;
      categoryDiv.appendChild(categoryLabel);
      categoryDiv.appendChild(ul);
      

      if (typeof session[category] === "object" &&Array.isArray(session[category])) {
        const nestedArray = session[category];
        
        if (category.includes('distractions')) {
          const li = document.createElement('li');
          const nestedContentRow =[];
          for (let i = 0; i < nestedArray.length; i++) {
            const nestedObject = nestedArray[i];
            nestedContentRow.push(nestedObject.type);
          }
          li.textContent= `${nestedContentRow.join(", ")}`;
          ul.appendChild(li);
        }else{
        
        for (let i = 0; i < nestedArray.length; i++) {
          const li = document.createElement('li');
          const nestedObject = nestedArray[i];
          const nestedContentRow = [];

          for (const nestedCategory in nestedObject) {
            if (
              nestedObject.hasOwnProperty(nestedCategory) &&
              !nestedCategory.includes("ID") &&
              !nestedCategory.includes("id")
            ) {
              const nestedValue = nestedObject[nestedCategory];
              const translatedValue = translate(nestedValue); // Replace with your translating function
              nestedContentRow.push(
                `${beautifyLabel(nestedCategory)} ${translatedValue}`
              );
              console.log(nestedContentRow);
              li.textContent = `${nestedContentRow.join(" -- ")}`;
          ul.appendChild(li);
            }
          }
        }
      }
        
      } else {
        const translatedValue = translate(session[category]); // Replace with your translating function
        const li =document.createElement('li');
        li.textContent=translatedValue;
        ul.appendChild(li);
      }

      modalContainer.appendChild(categoryDiv);
      
    }
  }
  modal.style.display = "block";

  closeBtn.addEventListener("click", () => {
    modal.style.display = "none";
  });
}

function clearContainer(container) {
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
}
function clearLogFormContainer() {
  const logFormContainer = document.querySelector(".log-form");
  const dynamicElements = logFormContainer.querySelectorAll(".session-container, .object-container, .distraction-container, .note-container");
  
  dynamicElements.forEach((element) => {    
    element.innerHTML = ''; // Clear the content of each dynamic element
  });
  
  const buttonDiv = document.querySelector('.button-div');
  if (buttonDiv) {
    
    logFormContainer.removeChild(buttonDiv);  
  }
}

function removePrefix(category) {
  return String(category).substring(String(category).search(/_/) + 1);
}

function beautifyLabel(category) {
  let string = removePrefix(category);
  string = string.replace(/_/g, " ");
  string = translate(string) + ":";
  return string.charAt(0).toUpperCase() + string.slice(1);
}
function translate(string) {
  switch (string) {
    case "dog":
      string = "hund";
      break;

    case "area":
      string = "sökområde";
      break;

    case "environment":
      string = "miljö";
      break;

    case "notes":
      string = "anteckningar";
      break;

    case "date":
      string = "datum";
      break;

    case "waiting time":
      string = "liggtid";
      break;

    case "object":
      string = "gömma";
      break;

    case "objects":
      string = "gömmor";
      break;

    case "found":
      string = "hittad";
      break;

    case "true":
      string = "ja";
      break;

    case "false":
      string = "nej";
      break;

    case "height":
      string = "höjd";
      break;

    case "size":
      string = "storlek";
      break;

    case "distractions":
      string = "störningar";
      break;

    case "distraction":
    case "type":
      string = "störning";
      break;

    default:
      break;
  }

  return string;
}
