//app-logic.js

document.addEventListener("DOMContentLoaded", async function () {
  const db = await openDatabase(); // Open the database

  const logLink = document.getElementById("logLink");
  const viewLink = document.getElementById("viewLink");
  const loggingSection = document.getElementById("loggingSection");
  const viewingSection = document.getElementById("viewingSection");
  const logConfirmationContainer = document.querySelector(".log-confirmation");
  const loggingForm = document.getElementById("logging-form");

  logLink.addEventListener("click", function () {
    loggingSection.style.display = "block";
    viewingSection.style.display = "none";
    clearContainer(logConfirmationContainer);
    loggingForm.reset();
    const dropdowns = loggingForm.querySelectorAll("select");
  dropdowns.forEach((dropdown) => {
    dropdown.selectedIndex = 0; // Reset to the placeholder option
  });
  });
  initializeLog(db);

  viewLink.addEventListener("click", function () {
    loggingSection.style.display = "none";
    viewingSection.style.display = "block";

    initializeView(db);
  });
});

async function initializeLog(db) {
  try {
    // Show the modal
    const modal = document.getElementById("objectModal");
    const submitButton = document.getElementById("submit-num-objects");
    const numObjectsInput = document.getElementById("num-objects-modal");

    modal.style.display = "block";

    // Handle the submit button
    submitButton.addEventListener("click", async () => {
      const numObjectsValue = parseInt(numObjectsInput.value, 10) || 1;

      // Close the modal
      modal.style.display = "none";

      // Fetch sessionCategories from the database
      const sessionCategories = await fetchCategories(db, "sessionAttributes");
      const objectCategories = await fetchCategories(db, "objectAttributes");
      const distractionCategories = await fetchCategories(
        db,
        "distractionAttributes"
      );

      const logFormContainer = document.querySelector(".log-form"); // Use the correct selector for your container
      const logConfirmationContainer =document.querySelector(".log-confirmation");
      const loggingForm = document.querySelector("#logging-form");
      const sessionContainer = document.querySelector('.session-container');
      const objectContainer = document.querySelector('.object-container');
      const distractionContainer = document.querySelector('.distraction-container');
      const dropdownPromises = [];

      clearContainer(logConfirmationContainer);

      let noteCategory;
      sessionCategories.forEach(async (category) => {
        if (category.includes("notes")) {
          noteCategory = category;
        } else {
          await createDropdown(db, category, loggingForm);
        }
      });

      for (let i = 0; i < numObjectsValue; i++) {
        const indObjectDiv = createObjectDiv(db, objectCategories, i);
        objectContainer.appendChild(indObjectDiv);
      }
      loggingForm.appendChild(objectContainer);

      if (noteCategory) {
        await createDropdown(db, noteCategory, loggingForm);
      }

      // Wait for all dropdowns to be created before appending the button
      Promise.all(dropdownPromises).then((dropdowns) => {
        dropdowns.forEach((dropdown) => {
          logFormContainer.appendChild(dropdown);
        });
        const buttonDiv = document.createElement("div");
        buttonDiv.className = "button-div";
        const saveSessionButton = document.createElement("button");
        saveSessionButton.classList.add("btn", "btn-success", "log-save");

        saveSessionButton.textContent = "Spara träningspass";
        saveSessionButton.addEventListener("click", () =>
          validateLoggingForm(db, sessionCategories)
        );
        const clearButton = document.createElement("button");
        clearButton.classList.add("btn", "btn-secondary", "log-clear");
        clearButton.textContent = "Rensa formulär";
        clearButton.addEventListener("click", () => {
          // Reset the input fields within the container
          loggingForm.reset();
          clearContainer(logConfirmationContainer);
          const dropdowns = logFormContainer.querySelectorAll("select");
  dropdowns.forEach((dropdown) => {
    dropdown.selectedIndex = 0; // Reset to the placeholder option
  });
        });

        buttonDiv.appendChild(saveSessionButton);
        buttonDiv.appendChild(clearButton);

        logFormContainer.appendChild(buttonDiv);
        logFormContainer.appendChild(logConfirmationContainer);
      });
    });
  } catch (error) {
    console.error("Error initializing dropdown menus", error);
  }
}

async function initializeView(db) {
  try {
    const categories = await fetchCategories(db);

    const filterContainer = document.querySelector(".filter-container");
    const displayContainer = document.querySelector(".view-sessions");

    clearContainer(filterContainer);
    clearContainer(displayContainer);

    // Loop through categories and create dropdowns
    categories.forEach(async (category) => {
      const catString = removePrefix(category);
      if (!category.includes("date") && !category.includes("notes")) {
        const viewCategoryContainer = document.createElement("div");
        viewCategoryContainer.className = `view-${catString}-container`;

        const label = document.createElement("label");
        label.textContent = beautifyLabel(category);
        viewCategoryContainer.appendChild(label);

        const viewDropdown = document.createElement("select");
        viewDropdown.className = "select-viewDropdown";
        viewDropdown.id = catString; // Set the id of the viewDropdown to the category name
        viewCategoryContainer.appendChild(viewDropdown);
        filterContainer.appendChild(viewCategoryContainer);

        await initializeDropdownOptions(db, viewDropdown, category);
      }
    });
    const filterButton = document.createElement("button");
    filterButton.classList.add("btn", "btn-primary");
    filterButton.textContent = "Filtrera och visa";
    filterContainer.appendChild(filterButton);
    filterButton.addEventListener("click", async () => {
      //const filters = collectFilters();
      const filters = await collectFilters(categories);
      filters.forEach((filter, index) => {
        console.log(
          `Filter ${index}: Category: ${filter.category}, Option: ${filter.option}`
        );
      });

      fetchAndDisplayFilteredSessions(db, filters);
    });
  } catch (error) {
    console.error("Error initializing viewing", error);
  }
}

async function collectFilters(categories) {
  const filters = [];
  const dropdowns = document.querySelectorAll(".select-viewDropdown");

  dropdowns.forEach((dropdown) => {
    const dropdownId = dropdown.id;
    const category = String(
      categories.find((cat) => dropdownId === removePrefix(cat))
    ); // Map dropdown.id to corresponding category
    const selectedOption = dropdown.value;

    if (selectedOption) {
      filters.push({ category, option: selectedOption });
    }
  });

  return filters;
}
async function fetchAndDisplayFilteredSessions(db, filters) {
  try {
    const sessions = await getSessionsByFilters(db, filters); // Fetch sessions based on filters
    console.log(sessions.length + "from app-logic");

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

  const availableCategories = new Set();
  let hasDate = false;
  let hasDog = false;

  for (const session of sessions) {
    if ("01_date" in session) {
      availableCategories.add("01_date");
      hasDate = true;
    }
    if ("02_dog" in session) {
      availableCategories.add("02_dog");
      hasDog = true;
    }
  }
  let noOfFilters = 0;
  for (const filter of filters) {
    if (filter.category !== "date" && filter.category !== "dog") {
      const category = filter.category;
      availableCategories.add(category);
      noOfFilters++;
      console.log(category);
    }
  }
  let showMore = true;

  if (!hasDate && !hasDog && noOfFilters === 0) {
    for (const session of sessions) {
      for (const category in session) {
        if (category !== "id") {
          availableCategories.add(category);
        }
      }
    }
    showMore = false;
  }

  availableCategories.forEach((category) => {
    const header = document.createElement("th");
    header.textContent = beautifyLabel(category);
    tableHeadersRow.appendChild(header);
  });

  sessions.forEach((session) => {
    const tableRow = document.createElement("tr");
    tableRow.setAttribute("data-session-id", session.id); // Set a data attribute if you have a unique session identifier

    availableCategories.forEach((category) => {
      const tableCell = document.createElement("td");
      tableCell.textContent = session[category] || "";
      tableRow.appendChild(tableCell);
    });

    // Add 'show more' button
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
  const modal = document.querySelector(".modal");
  const closeBtn = document.querySelector(".btn-close");
  const modalContainer = document.querySelector(".modal-container");
  const modalTitle = document.querySelector(".modal-title");

  modalContainer.innerHTML = "";
  modalTitle.innerHTML = "";

  for (category in session) {
    if (category === "date" || category === "dog") {
      modalTitle.textContent += `${session[category]} \u00A0\u00A0\u00A0\u00A0`;
    } else if (category !== "id" && session[category] !== "") {
      const categoryDiv = document.createElement("div");
      const categoryLabel = document.createElement("label");
      categoryLabel.className = "category-label";
      categoryLabel.textContent = beautifyLabel(category);
      const contentP = document.createElement("p");
      contentP.className = "content-p";
      contentP.textContent = session[category];

      modalContainer.appendChild(categoryDiv);
      categoryDiv.appendChild(categoryLabel);
      categoryDiv.appendChild(contentP);
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

async function createDropdown(db, category, loggingForm) {
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
  loggingForm.appendChild(categoryContainer);
}
function createObjectDiv(db, objectCategories, index) {
  // Create a div for an object and initialize the dropdowns
  const indObjectDiv = document.createElement("div");
  indObjectDiv.className = "ind-object-container";

  const label = document.createElement("label");
  label.textContent = `Gömma ${index+1}:`;
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

      if (!objectCategory.includes('found')) {
        
      
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
function createAddNewButton(db, category, categoryDropdown, categoryContainer) {
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
      let optionString=String(option);
      

      const optionElement = document.createElement("option");
      if (option===true || option ===false) {
        optionString=translate(optionString);
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
  categoryDropdown,
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

      // Add new option directly to the dropdown
      const optionElement = document.createElement("option");
      optionElement.value = newOptionValue;
      optionElement.textContent = newOptionValue;
      categoryDropdown.appendChild(optionElement);
      optionElement.selected = true;

      // Clear the input field
      inputField.value = "";
      inputContainer.remove();
    }
  });
}
async function validateLoggingForm(db, categories) {
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

    await addSessionToDB(db, formData);

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
function removePrefix(category) {
  return String(category).substring(String(category).search(/_/) + 1);
}

function beautifyLabel(category) {
  let string = removePrefix(category);
  string = string.replace(/_/g, " ");
  string=translate(string) + ":";
  return string.charAt(0).toUpperCase() + string.slice(1);
}
function translate(string) {
  
  switch (string) {
    case 'dog':
      string='hund'
      break;
  
    case 'area':
      string='sökområde'
      break;
  
    case 'environment':
      string='miljö'
      break;
  
    case 'notes':
      string='anteckningar'
      break;
  
    case 'date':
      string='datum'
      break;
  
    case 'waiting time':
      string='liggtid'
      break;

      case 'object':
      string='gömma'
      break;

      case 'objects':
      string='gömmor'
      break;

      case 'found':
      string='hittad'
      break;
  
      case 'true':
      string='ja'
      break;
  
      case 'false':
      string='nej'
      break;
  
      case 'height':
      string='höjd'
      break;
  
      case 'size':
      string='storlek'
      break;
  
      case 'distractions':
      string='störningar'
      break;
  
      case 'distraction':
      string='störning'
      break;
  
    default:
      break;
  }

  return string;
}
