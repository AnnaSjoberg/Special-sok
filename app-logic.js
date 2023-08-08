//app-logic.js

document.addEventListener("DOMContentLoaded", async function () {
  const db = await openDatabase(); // Open the database

  const logLink = document.getElementById("logLink");
  const viewLink = document.getElementById("viewLink");
  const loggingSection = document.getElementById("loggingSection");
  const viewingSection = document.getElementById("viewingSection");
  const logConfirmationContainer = document.querySelector(".log-confirmation");
  const sessionForm = document.getElementById('session-form');
  const inputContainer = document.querySelector(".input-container");

  logLink.addEventListener("click", function () {
    loggingSection.style.display = "block";
    viewingSection.style.display = "none";
    clearContainer(logConfirmationContainer);
    clearContainer(inputContainer);
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
    // Fetch categories from the database
    const categories = await fetchCategories(db);
    const logFormContainer = document.querySelector(".log-form"); // Use the correct selector for your container
    const logConfirmationContainer =document.querySelector(".log-confirmation");
    const sessionForm = document.querySelector('#session-form');
    const dropdownPromises = [];

    clearContainer(logConfirmationContainer);

    // Loop through categories and create dropdowns
    categories.forEach(async (category) => {
      await createDropdown(db, category, sessionForm);
     
    });

    // Wait for all dropdowns to be created before appending the button
    Promise.all(dropdownPromises).then((dropdowns) => {
      dropdowns.forEach((dropdown) => {
        logFormContainer.appendChild(dropdown);
      });

      const saveSessionButton = document.createElement("button");
      saveSessionButton.classList.add('btn', 'btn-success')
      
      saveSessionButton.textContent = "Spara träningspass";
      saveSessionButton.addEventListener("click", () =>
        validateSessionForm(db, categories),
        
      );
      logFormContainer.appendChild(saveSessionButton);
      logFormContainer.appendChild(logConfirmationContainer);
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
      if (!category.includes("date") && !category.includes("notes")) {
        const viewCategoryContainer = document.createElement("div");
        viewCategoryContainer.className = `view-${category}-container`;

        const label = document.createElement("label");
        label.textContent = beautifyLabel(category);
        viewCategoryContainer.appendChild(label);

        const viewDropdown = document.createElement("select");
        viewDropdown.className = "select-viewDropdown";
        viewDropdown.id = category; // Set the id of the viewDropdown to the category name
        viewCategoryContainer.appendChild(viewDropdown);
        filterContainer.appendChild(viewCategoryContainer);

        await initializeDropdownOptions(db, viewDropdown, category);
      }
    });
    const filterButton = document.createElement("button");
    filterButton.classList.add('btn', 'btn-primary')
    filterButton.textContent = "Filtrera och visa";
    filterContainer.appendChild(filterButton);
    filterButton.addEventListener("click", async () => {
      const filters = collectFilters();

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
function collectFilters() {
  const filters = [];
  const dropdowns = document.querySelectorAll(".select-viewDropdown");

  dropdowns.forEach((dropdown) => {
    const category = dropdown.id;
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
  sessionsTable.classList.add('table', 'table-striped', 'table-sm', "sessions-table");
  displayContainer.appendChild(sessionsTable);

  const tableHeadersRow = document.createElement("tr");
  sessionsTable.appendChild(tableHeadersRow);

  const availableCategories = new Set();
  let hasDate = false;
  let hasDog = false;

  for (const session of sessions) {
    if ("date" in session) {
      availableCategories.add("date");
      hasDate = true;
    }
    if ("dog" in session) {
      availableCategories.add("dog");
      hasDog = true;
    }
  }
  let noOfFilters = 0;
  for (const filter of filters) {
    if (filter.category !== "date" && filter.category !== "dog") {
      const category = filter.category;
      availableCategories.add(category);
      noOfFilters++;
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
      showMoreButton.classList.add('btn', 'btn-sm', 'btn-info','show-more-button');
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
    const modalTitle = document.querySelector('.modal-title');
    
modalContainer.innerHTML = "";
modalTitle.innerHTML="";

  for (category in session) {
    if (category === 'date' || category === 'dog') {
        modalTitle.textContent+=`${session[category]} \u00A0\u00A0\u00A0\u00A0`
    }

    else if (category !== "id" && session[category] !== "") {
      const categoryDiv = document.createElement("div");
      const categoryLabel = document.createElement("label");
      categoryLabel.className='category-label';
      categoryLabel.textContent = beautifyLabel(category);
      const contentP = document.createElement("p");
      contentP.className='content-p';
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

function beautifyLabel(category) {
  category = String(category).replace(/_/g, " ") + ":";
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function clearContainer(container) {
  console.log(container);
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
}

async function createDropdown(db, category, sessionForm) {
  const categoryContainer = document.createElement("div");
  categoryContainer.className = `${category}Container`;

  const label = document.createElement("label");
  label.textContent = beautifyLabel(category);
  categoryContainer.appendChild(label);

  if (category.includes("date")) {
    const dateChooser = document.createElement("input");
    dateChooser.className = "date-chooser";
    dateChooser.type = "date";
    dateChooser.id = category;
    categoryContainer.appendChild(dateChooser);

  } else if (category.includes("notes")) {
    const noteArea = document.createElement("textarea");
    noteArea.rows = 4;
    noteArea.placeholder = "Anteckningar (valfri)";
    noteArea.className = "note-area";
    noteArea.id=category;
    categoryContainer.appendChild(noteArea);

  } else {
    const logDropdown = document.createElement("select");
    logDropdown.className = "select-logDropdown";
    logDropdown.id = category; // Set the id of the logDropdown to the category name

    initializeDropdownOptions(db, logDropdown, category);

    const addButton = document.createElement("button");
    addButton.classList.add('btn', 'btn-warning', 'btn-sm');
    addButton.type='button';
    addButton.textContent = "Lägg till alternativ";
    addButton.addEventListener("click", () => {
      showAddNewInput(db, category);
    });
    categoryContainer.appendChild(logDropdown);
    categoryContainer.appendChild(addButton);
  }
   sessionForm.appendChild(categoryContainer);
}

async function initializeDropdownOptions(db, dropdown, category) {
  try {
    const options = await fetchOptions(db, category); // Fetch options from indexedDB

    dropdown.innerHTML = "";

    const blankElement = document.createElement("option");
    blankElement.value = "";
    blankElement.textContent = "";
    dropdown.appendChild(blankElement);
    blankElement.selected = true;

    options.forEach((option) => {
      const optionElement = document.createElement("option");
      optionElement.value = option;
      optionElement.textContent = option;
      dropdown.appendChild(optionElement);
    });
  } catch (error) {
    console.error("Error initializing dropdown options", error);
  }
}
async function showAddNewInput(db, category) {
  const categoryDropdown = document.querySelector(`#${category}`);

  // Clear the old input container if it exists
  const oldInputContainer = document.querySelector(".input-container");
  if (oldInputContainer) {
    oldInputContainer.remove();
  }

  //const inputContainer = document.querySelector(".input-container");
  const inputContainer = document.createElement("div");
  inputContainer.className = "input-container";
  //clearContainer(inputContainer);

  const inputField = document.createElement("input");
  inputField.type = "text";
  inputField.placeholder = "Enter new option";

  const saveButton = document.createElement("button");
  saveButton.classList.add('btn', 'btn-danger', 'btn-sm');
  saveButton.textContent = "Spara";

  inputContainer.appendChild(inputField);
  inputContainer.appendChild(saveButton);

  const categoryContainer = document.querySelector(`.${category}Container`);
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
async function validateSessionForm(db, categories) {
  const formData = {};
  const logConfirmationContainer = document.querySelector(".log-confirmation");
  const confirmation = document.createElement("h4");

  clearContainer(logConfirmationContainer);

  logConfirmationContainer.appendChild(confirmation);

  try {
    for (const category of categories) {
      const option = document.querySelector(`#${category}`);
      if (category === "notes") {
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

    // Reset the input fields within the container
    const sessionForm = document.querySelector("#session-form");
    sessionForm.reset();
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
