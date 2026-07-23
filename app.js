/* Expense & Budget Visualizer — application logic */
/* Modules implemented in Tasks 2–8 */

/* ==========================================================================
   DATA LAYER — Task 2.1: StorageAdapter
   Requirements: TC-2.1, 6.1, 6.2, 6.5, 6.6
   ========================================================================== */

const StorageAdapter = {
  STORAGE_KEY: 'expense_tracker_transactions',

  /**
   * Read transactions from localStorage.
   * Returns a parsed array on success, or null on any failure.
   * @returns {Array|null}
   */
  read() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw === null) {
        return null;
      }
      const parsed = JSON.parse(raw);
      // Guard against corrupted data that isn't an array
      if (!Array.isArray(parsed)) {
        return null;
      }
      return parsed;
    } catch (e) {
      return null;
    }
  },

  /**
   * Write transactions to localStorage.
   * Returns true on success, false on any failure.
   * @param {Array} transactions
   * @returns {boolean}
   */
  write(transactions) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(transactions));
      return true;
    } catch (e) {
      return false;
    }
  }
};

/* ==========================================================================
   DATA LAYER — Task 2.3: TransactionStore
   Requirements: TC-2.1, 1.1, 3.1, 4.3, 5.1, 5.2, 6.1, 6.2, 6.3, 6.4
   ========================================================================== */

const TransactionStore = {
  /** @type {Array} In-memory transaction list */
  transactions: [],

  /**
   * Load transactions from localStorage into memory.
   * Falls back to an empty array on null or any error.
   * Requirement 6.3, 6.4, 6.5
   */
  load() {
    try {
      const data = StorageAdapter.read();
      this.transactions = Array.isArray(data) ? data : [];
    } catch (e) {
      this.transactions = [];
    }
  },

  /**
   * Append a transaction to the list and persist to storage.
   * Returns true if the write succeeded, false otherwise.
   * Requirement 6.1, 6.6
   * @param {Object} transaction
   * @returns {boolean}
   */
  add(transaction) {
    this.transactions = [...this.transactions, transaction];
    const success = StorageAdapter.write(this.transactions);
    if (!success) {
      // Revert the in-memory change on write failure
      this.transactions = this.transactions.slice(0, this.transactions.length - 1);
      return false;
    }
    return true;
  },

  /**
   * Remove a transaction by id and persist the updated list.
   * Reverts the in-memory change if the write fails.
   * Returns true on success, false on failure or if id not found.
   * Requirement 4.3, 6.2, 6.6
   * @param {string} id
   * @returns {boolean}
   */
  delete(id) {
    const previous = this.transactions;
    const updated = this.transactions.filter(t => t.id !== id);

    // If nothing was removed, id didn't exist — treat as failure
    if (updated.length === previous.length) {
      return false;
    }

    this.transactions = updated;
    const success = StorageAdapter.write(this.transactions);
    if (!success) {
      // Revert to pre-deletion state on write failure
      this.transactions = previous;
      return false;
    }
    return true;
  },

  /**
   * Return all transactions sorted by date descending.
   * When two transactions share the same date, sort by timestamp descending.
   * Requirement 3.1
   * @returns {Array}
   */
  getAll() {
    return [...this.transactions].sort((a, b) => {
      // Primary: date descending (lexicographic comparison works for YYYY-MM-DD)
      if (a.date > b.date) return -1;
      if (a.date < b.date) return 1;
      // Secondary tiebreaker: timestamp descending
      return b.timestamp - a.timestamp;
    });
  },

  /**
   * Calculate the current balance: sum of income amounts minus sum of expense amounts.
   * Requirement 1.1
   * @returns {number}
   */
  getBalance() {
    return this.transactions.reduce((sum, t) => {
      if (t.type === 'income') {
        return sum + t.amount;
      } else if (t.type === 'expense') {
        return sum - t.amount;
      }
      return sum;
    }, 0);
  },

  /**
   * Return a plain object mapping each expense category to its total amount.
   * Only expense transactions are included; income transactions are ignored.
   * Example: { Food: 42.50, Transport: 15.00 }
   * Requirements 5.1, 5.2
   * @returns {Object}
   */
  getCategoryTotals() {
    return this.transactions.reduce((totals, t) => {
      if (t.type === 'expense') {
        totals[t.category] = (totals[t.category] || 0) + t.amount;
      }
      return totals;
    }, {});
  }
};

/* ==========================================================================
   APPLICATION LAYER — Task 3.4: Formatting
   Requirements: 1.1, 3.2, 3.4
   ========================================================================== */

const Formatting = {
  /**
   * Format a number as an IDR currency string with dot-separated thousands,
   * no decimal places, and "Rp " prefix.
   * Uses the absolute value of the input.
   * Examples: 150000 → "Rp 150.000", 1500000 → "Rp 1.500.000", 0 → "Rp 0"
   * Requirement 1.1, 3.2
   * @param {number} amount
   * @returns {string}
   */
  formatCurrency(amount) {
    const abs = Math.abs(Math.round(Number(amount)));
    return 'Rp ' + abs.toLocaleString('id-ID');
  },

  /**
   * Accept a YYYY-MM-DD date string and return it as-is.
   * If the input is already in YYYY-MM-DD format, it is returned unchanged.
   * Requirement 3.4
   * @param {string} dateStr
   * @returns {string}
   */
  formatDate(dateStr) {
    // Input is expected to be a YYYY-MM-DD string (from <input type="date">).
    // Return it unchanged; it is already in the correct format.
    return dateStr;
  },

  /**
   * Parse a string to a float. Returns null for empty, whitespace-only,
   * non-numeric, or NaN inputs.
   * Requirement 1.1
   * @param {string} input
   * @returns {number|null}
   */
  parseAmount(input) {
    if (typeof input !== 'string' || input.trim() === '') {
      return null;
    }
    const parsed = parseFloat(input.trim());
    if (isNaN(parsed)) {
      return null;
    }
    return parsed;
  },

  /**
   * Generate a UUID v4-like string.
   * Uses crypto.randomUUID() if available; otherwise falls back to a
   * manual implementation using Math.random().
   * Requirement 1.1
   * @returns {string}
   */
  generateId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    // Manual UUID v4 fallback
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
};

/* ==========================================================================
   APPLICATION LAYER — Task 3.1: Validation
   Requirements: 2.4, 2.5, 2.6, 2.7
   ========================================================================== */

const Validation = {
  /**
   * Validate a transaction description.
   * Trims the value; rejects empty/whitespace-only strings and strings > 100 chars.
   * Requirement 2.4
   * @param {string} value
   * @returns {{ isValid: boolean, errorMessage: string }}
   */
  validateDescription(value) {
    const trimmed = (value || '').trim();
    if (trimmed.length === 0) {
      return { isValid: false, errorMessage: 'Description is required.' };
    }
    if (trimmed.length > 100) {
      return { isValid: false, errorMessage: 'Description must be 100 characters or fewer.' };
    }
    return { isValid: true, errorMessage: '' };
  },

  /**
   * Validate a transaction amount.
   * Uses Formatting.parseAmount() to parse the raw input string.
   * Accepts positive numbers in [0.01, 999,999,999.99].
   * Rejects empty, non-numeric, ≤ 0, or > 999,999,999.99 values.
   * Requirement 2.5
   * @param {string} value
   * @returns {{ isValid: boolean, errorMessage: string }}
   */
  validateAmount(value) {
    const raw = (value || '').trim();
    if (raw.length === 0) {
      return { isValid: false, errorMessage: 'Amount is required.' };
    }
    const parsed = Formatting.parseAmount(raw);
    if (parsed === null) {
      return { isValid: false, errorMessage: 'Please enter a valid number.' };
    }
    if (parsed <= 0) {
      return { isValid: false, errorMessage: 'Amount must be greater than 0.' };
    }
    if (parsed > 999999999.99) {
      return { isValid: false, errorMessage: 'Amount is too large.' };
    }
    return { isValid: true, errorMessage: '' };
  },

  /**
   * Validate a transaction category.
   * Accepts any category name returned by CategoryStore.getAll() — built-ins
   * and any user-created custom categories.
   * Requirements 2.6, 8.1, 8.6
   * @param {string} value
   * @returns {{ isValid: boolean, errorMessage: string }}
   */
  validateCategory(value) {
    if (!CategoryStore.getAll().includes(value)) {
      return { isValid: false, errorMessage: 'Please select a category.' };
    }
    return { isValid: true, errorMessage: '' };
  },

  /**
   * Validate a transaction date.
   * Rejects empty strings; any non-empty string is considered valid input.
   * Requirement 2.7
   * @param {string} value
   * @returns {{ isValid: boolean, errorMessage: string }}
   */
  validateDate(value) {
    if (!value || value.trim().length === 0) {
      return { isValid: false, errorMessage: 'Date is required.' };
    }
    return { isValid: true, errorMessage: '' };
  }
};

/* ==========================================================================
   UI LAYER — Task 5.1: BalanceDisplay
   Requirements: 1.1, 1.4, 1.5
   ========================================================================== */

const BalanceDisplay = {
  /**
   * Update the #balance-display element with the formatted balance string.
   * Positive/zero values are prefixed with "+"; negative values use the
   * "-" sign that toFixed naturally produces.
   * Examples: 1234.56 → "+1234.56", 0 → "+0.00", -50.25 → "-50.25"
   * Requirement 1.1
   * @param {number} balance
   */
  render(balance) {
    const el = document.getElementById('balance-display');
    if (!el) return;
    const formatted = Formatting.formatCurrency(Math.abs(balance));
    el.textContent = balance >= 0 ? '+' + formatted : '\u2212' + formatted;
  },

  /**
   * Apply `balance--positive` CSS class when balance >= 0,
   * or `balance--negative` when balance < 0.
   * Always removes the non-applicable class.
   * Requirements 1.4, 1.5
   * @param {number} balance
   */
  applyStyle(balance) {
    const el = document.getElementById('balance-display');
    if (!el) return;
    if (balance >= 0) {
      el.classList.add('balance--positive');
      el.classList.remove('balance--negative');
    } else {
      el.classList.add('balance--negative');
      el.classList.remove('balance--positive');
    }
  }
};

/* ==========================================================================
   UI LAYER — Task 5.3: TransactionForm
   Requirements: 2.1, 2.4, 2.5, 2.6, 2.7, 2.9
   ========================================================================== */

const TransactionForm = {
  /**
   * Map from fieldName to its corresponding element ID.
   * fieldName is the logical name used by getData/showError/clearError.
   * @type {Object}
   */
  FIELD_MAP: {
    description: 'desc',
    amount:      'amount',
    category:    'category',
    // 'type' is handled separately via radio buttons (type-expense / type-income)
    date:        'date'
  },

  /**
   * Return today's date in YYYY-MM-DD format (local time).
   * @returns {string}
   */
  _todayISO() {
    const now = new Date();
    const year  = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day   = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /**
   * Lazy DOM lookup — resolves a field element by fieldName.
   * Returns null if the element is not found.
   * @param {string} fieldName  — logical name ('description', 'amount', etc.)
   * @returns {HTMLElement|null}
   */
  _getField(fieldName) {
    const id = this.FIELD_MAP[fieldName];
    if (!id) return null;
    return document.getElementById(id);
  },

  /**
   * Read current form field values and return them as raw strings.
   * Returns { description, amount, category, type, date }
   * 'type' is read from the checked radio button in the [name="type"] group.
   * @returns {Object}
   */
  getData() {
    // Read the checked radio for transaction type
    const checkedRadio = document.querySelector('input[name="type"]:checked');
    return {
      description: (document.getElementById('desc')     || {}).value || '',
      amount:      (document.getElementById('amount')   || {}).value || '',
      category:    (document.getElementById('category') || {}).value || '',
      type:        checkedRadio ? checkedRadio.value : '',
      date:        (document.getElementById('date')     || {}).value || ''
    };
  },

  /**
   * Display a validation error message adjacent to the named field.
   * For radio groups (fieldName 'type'), the error is appended to the
   * parent <fieldset>. For all other fields, inserts a <span class="form-error">
   * right after the field element.
   * Also sets aria-invalid="true" on the field.
   * @param {string} fieldName
   * @param {string} message
   */
  showError(fieldName, message) {
    // Special handling for radio group
    if (fieldName === 'type') {
      const fieldset = document.querySelector('fieldset.form-group--fieldset');
      if (!fieldset) return;
      let errorSpan = fieldset.querySelector('.form-error');
      if (!errorSpan) {
        errorSpan = document.createElement('span');
        errorSpan.className = 'form-error';
        errorSpan.setAttribute('role', 'alert');
        fieldset.appendChild(errorSpan);
      }
      errorSpan.textContent = message;
      // Mark all radios in the group as invalid
      fieldset.querySelectorAll('input[name="type"]').forEach(r => {
        r.setAttribute('aria-invalid', 'true');
      });
      return;
    }

    const field = this._getField(fieldName);
    if (!field) return;

    field.setAttribute('aria-invalid', 'true');

    // Reuse existing error span or create a new one
    let errorSpan = field.nextElementSibling;
    if (!errorSpan || !errorSpan.classList.contains('form-error')) {
      errorSpan = document.createElement('span');
      errorSpan.className = 'form-error';
      errorSpan.setAttribute('role', 'alert');
      field.parentNode.insertBefore(errorSpan, field.nextSibling);
    }
    errorSpan.textContent = message;
  },

  /**
   * Remove the validation error message adjacent to the named field
   * and clear aria-invalid from the field.
   * @param {string} fieldName
   */
  clearError(fieldName) {
    const field = this._getField(fieldName);
    if (!field) return;

    field.removeAttribute('aria-invalid');

    const next = field.nextElementSibling;
    if (next && next.classList.contains('form-error')) {
      next.parentNode.removeChild(next);
    }
  },

  /**
   * Reset all form fields, set the date to today, and return focus to #desc.
   */
  reset() {
    const form = document.getElementById('transaction-form');
    if (form) {
      form.reset();
    }

    // After form.reset(), restore date to today (browsers clear it to empty)
    const dateField = document.getElementById('date');
    if (dateField) {
      dateField.value = this._todayISO();
    }

    // Clear any lingering aria-invalid and error spans on all fields
    Object.keys(this.FIELD_MAP).forEach(name => this.clearError(name));

    // Return focus to the description field
    const descField = document.getElementById('desc');
    if (descField) {
      descField.focus();
    }
  },

  /**
   * Attach `input` event listeners to each form field so that typing
   * automatically clears the associated validation error.
   * Should be called once during app initialization.
   */
  init() {
    // Set date field to today's date on first load
    const dateField = document.getElementById('date');
    if (dateField && !dateField.value) {
      dateField.value = this._todayISO();
    }

    // Wire up clearError on input for every field
    Object.entries(this.FIELD_MAP).forEach(([fieldName, id]) => {
      const field = document.getElementById(id);
      if (field) {
        field.addEventListener('input', () => {
          TransactionForm.clearError(fieldName);
        });
        // Also handle 'change' for select elements (value changes without 'input' in some browsers)
        if (field.tagName === 'SELECT') {
          field.addEventListener('change', () => {
            TransactionForm.clearError(fieldName);
          });
        }
      }
    });
  }
};

/* ==========================================================================
   UI LAYER — Task 6.1: TransactionList
   Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
   ========================================================================== */

const TransactionList = {
  /** @type {number} Current pagination page (1-based) */
  currentPage: 1,

  /** @type {number} Maximum transactions displayed per page */
  ITEMS_PER_PAGE: 50,

  /**
   * Current sort order for the transaction list.
   * Resets to 'date-desc' on every page load (not persisted).
   * Requirements: 10.2
   * @type {'date-desc'|'amount-desc'|'amount-asc'|'category-asc'}
   */
  currentSort: 'date-desc',

  /**
   * Return a sorted copy of the input array without mutating it.
   *
   * Sort rules (tiebreaker is always date descending):
   *   date-desc     — primary: date desc,     tiebreaker: timestamp desc
   *   amount-desc   — primary: amount desc,   tiebreaker: date desc
   *   amount-asc    — primary: amount asc,    tiebreaker: date desc
   *   category-asc  — primary: category asc (locale), tiebreaker: date desc
   *
   * Unknown sort orders silently fall back to 'date-desc'.
   *
   * Requirements: 10.3, 10.4, 10.5
   * @param {Array} transactions  — input array (not mutated)
   * @param {string} order        — one of the four SortOrder values
   * @returns {Array}             — sorted copy
   */
  _applySortOrder(transactions, order) {
    // Work on a shallow copy so the original is never mutated
    const copy = transactions.slice();

    switch (order) {
      case 'date-desc':
        copy.sort((a, b) => {
          // Primary: date descending (lexicographic on YYYY-MM-DD)
          if (a.date > b.date) return -1;
          if (a.date < b.date) return  1;
          // Tiebreaker: timestamp descending
          return b.timestamp - a.timestamp;
        });
        break;

      case 'amount-desc':
        copy.sort((a, b) => {
          // Primary: amount descending
          if (b.amount !== a.amount) return b.amount - a.amount;
          // Tiebreaker: date descending
          if (a.date > b.date) return -1;
          if (a.date < b.date) return  1;
          return 0;
        });
        break;

      case 'amount-asc':
        copy.sort((a, b) => {
          // Primary: amount ascending
          if (a.amount !== b.amount) return a.amount - b.amount;
          // Tiebreaker: date descending
          if (a.date > b.date) return -1;
          if (a.date < b.date) return  1;
          return 0;
        });
        break;

      case 'category-asc':
        copy.sort((a, b) => {
          // Primary: category ascending (locale-aware)
          const catCmp = a.category.localeCompare(b.category);
          if (catCmp !== 0) return catCmp;
          // Tiebreaker: date descending
          if (a.date > b.date) return -1;
          if (a.date < b.date) return  1;
          return 0;
        });
        break;

      default:
        // Unknown sort order — fall back to date-desc silently
        copy.sort((a, b) => {
          if (a.date > b.date) return -1;
          if (a.date < b.date) return  1;
          return b.timestamp - a.timestamp;
        });
        break;
    }

    return copy;
  },

  /**
   * Update the current sort order and re-render the transaction list.
   * Called when the user changes the sort <select> value.
   * Requirements: 10.2, 10.5
   * @param {string} order  — one of the four SortOrder values
   */
  setSortOrder(order) {
    this.currentSort = order;
    AppController.refreshUI();
  },

  /**
   * Navigate to page 1.
   * Called by AppController after a new transaction is successfully added.
   */
  goToPage1() {
    this.currentPage = 1;
  },

  /**
   * Render the full transaction list inside #transaction-list.
   * Applies the current sort order before rendering, then clears the container,
   * delegates to renderEmptyState() when the array is empty, otherwise renders
   * the current page's items and (when > 50 total) pagination controls.
   *
   * Pagination after delete: if the current page's slice would be empty and
   * currentPage > 1, decrement currentPage before rendering.
   *
   * Requirements 3.1, 3.3, 3.6, 10.2, 10.5, 11.3, 11.4, 11.5
   * @param {Array}      transactions  — unsorted array from TransactionStore.getAll()
   * @param {Set<string>} [overLimitSet] — categories whose totals >= their limit
   */
  render(transactions, overLimitSet) {
    // Apply the current sort order — returns a sorted copy, original not mutated
    transactions = this._applySortOrder(transactions || [], this.currentSort);
    const container = document.getElementById('transaction-list');
    if (!container) return;

    // Clear previous content
    container.innerHTML = '';

    if (!transactions || transactions.length === 0) {
      this.renderEmptyState();
      return;
    }

    const total = transactions.length;
    const totalPages = Math.ceil(total / this.ITEMS_PER_PAGE);

    // Guard: if currentPage exceeds totalPages (e.g. after a delete shrinks
    // the last page away), move back one page.
    if (this.currentPage > totalPages && this.currentPage > 1) {
      this.currentPage = totalPages;
    }

    const start = (this.currentPage - 1) * this.ITEMS_PER_PAGE;
    const end   = Math.min(start + this.ITEMS_PER_PAGE, total);
    const pageItems = transactions.slice(start, end);

    // Build the <ul> and append each item
    const ul = document.createElement('ul');
    ul.className = 'transaction-items';
    pageItems.forEach(transaction => {
      ul.appendChild(this.renderItem(transaction, overLimitSet));
    });
    container.appendChild(ul);

    // Render pagination controls only when there are more than 50 transactions
    if (total > this.ITEMS_PER_PAGE) {
      container.appendChild(this._buildPagination(totalPages));
    }
  },

  /**
   * Render the empty-state message inside #transaction-list.
   * Requirement 3.3
   */
  renderEmptyState() {
    const container = document.getElementById('transaction-list');
    if (!container) return;

    const p = document.createElement('p');
    p.className = 'empty-state';
    p.textContent = 'No transactions recorded yet.';
    container.appendChild(p);
  },

  /**
   * Build and return a single <li> element for the given transaction.
   * Requirements 3.2, 3.4, 3.5, 4.1, 11.3, 11.5
   *
   * Structure:
   *   <li class="transaction-item transaction-item--[type]">
   *     <span class="transaction-description">[description]</span>
   *     <span class="transaction-amount transaction-amount--[type]">[sign][amount]</span>
   *     <span class="category-badge [over-limit?]">[category]</span>
   *     <span class="transaction-type">[type]</span>
   *     <span class="transaction-date">[date]</span>
   *     <button class="delete-btn" data-id="[id]">Delete</button>
   *   </li>
   *
   * @param {Object}      transaction
   * @param {Set<string>} [overLimitSet] — categories whose totals >= their limit
   * @returns {HTMLLIElement}
   */
  renderItem(transaction, overLimitSet) {
    const li = document.createElement('li');
    li.className = `transaction-item transaction-item--${transaction.type}`;

    // Description
    const desc = document.createElement('span');
    desc.className = 'transaction-description';
    desc.textContent = transaction.description;

    // Amount — formatCurrency returns "Rp 1.500.000"; prepend − (U+2212) for expenses, + for income
    const amountPrefix = transaction.type === 'expense' ? '\u2212' : '+';
    const amountFormatted = Formatting.formatCurrency(transaction.amount);
    const amount = document.createElement('span');
    amount.className = `transaction-amount transaction-amount--${transaction.type}`;
    amount.textContent = amountPrefix + amountFormatted;

    // Category badge — apply 'over-limit' when this transaction's category is over its limit
    const badge = document.createElement('span');
    const isOverLimit = overLimitSet instanceof Set && overLimitSet.has(transaction.category);
    badge.className = isOverLimit ? 'category-badge over-limit' : 'category-badge';
    badge.textContent = transaction.category;

    // Type label
    const typeSpan = document.createElement('span');
    typeSpan.className = 'transaction-type';
    typeSpan.textContent = transaction.type;

    // Date
    const dateSpan = document.createElement('span');
    dateSpan.className = 'transaction-date';
    dateSpan.textContent = Formatting.formatDate(transaction.date);

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.dataset.id = transaction.id;
    deleteBtn.textContent = 'Delete';
    deleteBtn.setAttribute('aria-label', `Delete transaction: ${transaction.description}`);

    li.appendChild(desc);
    li.appendChild(amount);
    li.appendChild(badge);
    li.appendChild(typeSpan);
    li.appendChild(dateSpan);
    li.appendChild(deleteBtn);

    return li;
  },

  /**
   * Build and return the pagination control element.
   * Uses <nav> so that screen readers expose it as a navigation landmark.
   * @private
   * @param {number} totalPages
   * @returns {HTMLElement}
   */
  _buildPagination(totalPages) {
    const div = document.createElement('nav');
    div.className = 'pagination';
    div.setAttribute('aria-label', 'Transaction pages');

    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.className = 'pagination-prev';
    prevBtn.textContent = 'Previous';
    prevBtn.disabled = this.currentPage <= 1;
    prevBtn.addEventListener('click', () => {
      if (this.currentPage > 1) {
        this.currentPage -= 1;
        // Re-render using the most recent sorted transaction list
        AppController.refreshUI();
      }
    });

    // Page indicator
    const pageInfo = document.createElement('span');
    pageInfo.className = 'pagination-info';
    pageInfo.textContent = `Page ${this.currentPage} of ${totalPages}`;

    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'pagination-next';
    nextBtn.textContent = 'Next';
    nextBtn.disabled = this.currentPage >= totalPages;
    nextBtn.addEventListener('click', () => {
      if (this.currentPage < totalPages) {
        this.currentPage += 1;
        AppController.refreshUI();
      }
    });

    div.appendChild(prevBtn);
    div.appendChild(pageInfo);
    div.appendChild(nextBtn);

    return div;
  }
};

/* ==========================================================================
   UI LAYER — Task 7.1: Chart
   Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
   ========================================================================== */

const Chart = {
  /** Distinct fill colors for the five built-in categories */
  CATEGORY_COLORS: {
    Food:          '#FF6384',
    Transport:     '#36A2EB',
    Entertainment: '#FFCE56',
    Health:        '#4BC0C0',
    Other:         '#9966FF'
  },

  /**
   * Palette used for custom (non-built-in) categories.
   * Colors are assigned by cycling through this array using
   * (customIndex % CUSTOM_COLOR_PALETTE.length).
   * Requirement 8.6
   */
  CUSTOM_COLOR_PALETTE: [
    '#6c5ce7', '#00b894', '#fdcb6e', '#e17055', '#74b9ff',
    '#a29bfe', '#55efc4', '#ffeaa7', '#fab1a0', '#81ecec'
  ],

  /**
   * Resolve the display color for a category name.
   * Built-in categories return their hardcoded color.
   * Custom categories are assigned a color from CUSTOM_COLOR_PALETTE based
   * on their position among all custom categories in CategoryStore.getAll().
   * Requirement 8.6
   * @param {string} name  Category name
   * @returns {string}  CSS color string
   */
  _colorForCategory(name) {
    // Built-in → hardcoded color
    if (Object.prototype.hasOwnProperty.call(this.CATEGORY_COLORS, name)) {
      return this.CATEGORY_COLORS[name];
    }

    // Custom → derive index from CategoryStore order (built-ins first, then custom)
    const allCategories = (typeof CategoryStore !== 'undefined')
      ? CategoryStore.getAll()
      : [];
    const builtInCount = (typeof CategoryStore !== 'undefined')
      ? CategoryStore.BUILT_IN.length
      : 5;

    // Position in the full list minus the built-in offset = custom index
    const posInAll = allCategories.indexOf(name);
    const customIndex = posInAll >= builtInCount ? posInAll - builtInCount : 0;

    return this.CUSTOM_COLOR_PALETTE[customIndex % this.CUSTOM_COLOR_PALETTE.length];
  },

  /**
   * Render the pie chart from category totals.
   * If all totals are zero or the object is empty, delegates to renderEmptyState().
   * Otherwise draws the pie on #chart-canvas and the legend in #chart-legend.
   * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 8.6, 11.4, 11.5
   * @param {Object}      categoryTotals  e.g. { Food: 42.50, Transport: 15.00 }
   * @param {Set<string>} [overLimitSet]  categories whose totals >= their limit
   */
  render(categoryTotals, overLimitSet) {
    const canvas = document.getElementById('chart-canvas');
    if (!canvas) return;

    // Filter to categories with a positive total
    const entries = Object.entries(categoryTotals || {}).filter(
      ([, v]) => typeof v === 'number' && v > 0
    );

    if (entries.length === 0) {
      this.renderEmptyState();
      return;
    }

    // Show canvas, remove any existing empty-state message
    canvas.style.display = '';
    const existingMsg = document.querySelector('.chart-empty');
    if (existingMsg) existingMsg.remove();

    const totalExpenses = entries.reduce((sum, [, v]) => sum + v, 0);

    // Build category data with raw percentages.
    // Colors: built-in categories use hardcoded colors; custom categories
    // are assigned colors from CUSTOM_COLOR_PALETTE by their custom index.
    const categories = entries.map(([name, amount]) => ({
      name,
      amount,
      color: this._colorForCategory(name),
      pctRaw: (amount / totalExpenses) * 100   // full precision for slice angles
    }));

    // Compute display percentages rounded to 1 decimal place,
    // then adjust the largest slice so they sum to exactly 100.0
    const rounded = categories.map(c => Math.round(c.pctRaw * 10) / 10);
    const roundedSum = rounded.reduce((s, p) => s + p, 0);
    const diff = Math.round((100 - roundedSum) * 10) / 10;   // e.g. 0.1 or -0.1
    if (diff !== 0) {
      // Apply adjustment to the category with the largest raw percentage
      let maxIdx = 0;
      categories.forEach((c, i) => {
        if (c.pctRaw > categories[maxIdx].pctRaw) maxIdx = i;
      });
      rounded[maxIdx] = Math.round((rounded[maxIdx] + diff) * 10) / 10;
    }

    // Attach final display percentage to each category object
    categories.forEach((c, i) => { c.pctDisplay = rounded[i]; });

    // --- Draw pie chart ---
    const ctx = canvas.getContext('2d');
    const width  = canvas.width  || 300;
    const height = canvas.height || 300;
    const centerX = width  / 2;
    const centerY = height / 2;
    const radius  = Math.min(centerX, centerY) * 0.9;

    ctx.clearRect(0, 0, width, height);

    if (categories.length === 1) {
      // Single category: full circle
      this.drawSlice(ctx, 0, 2 * Math.PI, categories[0].color, centerX, centerY, radius);
    } else {
      const MIN_ANGLE = (1 / 100) * 2 * Math.PI * 0.5; // minimum visible arc for < 1%
      let startAngle = -Math.PI / 2; // start at top (12 o'clock)

      categories.forEach(c => {
        // Use raw percentage to determine angle, but enforce a minimum for tiny slices
        let sliceAngle = (c.pctRaw / 100) * 2 * Math.PI;
        if (c.pctRaw < 1 && sliceAngle < MIN_ANGLE) {
          sliceAngle = MIN_ANGLE;
        }
        const endAngle = startAngle + sliceAngle;
        this.drawSlice(ctx, startAngle, endAngle, c.color, centerX, centerY, radius);
        startAngle = endAngle;
      });
    }

    // --- Draw legend ---
    this.drawLegend(categories, overLimitSet);
  },

  /**
   * Hide the canvas and show a "No expense data" placeholder paragraph.
   * Requirement: 5.7
   */
  renderEmptyState() {
    const canvas = document.getElementById('chart-canvas');
    if (canvas) canvas.style.display = 'none';

    // Clear any existing legend
    const legend = document.getElementById('chart-legend');
    if (legend) legend.innerHTML = '';

    // Show the empty-state message if not already present
    if (!document.querySelector('.chart-empty')) {
      const section = document.getElementById('chart-section') || document.body;
      const p = document.createElement('p');
      p.className = 'chart-empty';
      p.textContent = 'No expense data to display.';
      section.appendChild(p);
    }
  },

  /**
   * Draw a single filled pie slice on the given canvas context.
   * Requirement: 5.4
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} startAngle  Radians
   * @param {number} endAngle    Radians
   * @param {string} color       CSS color string
   * @param {number} centerX
   * @param {number} centerY
   * @param {number} radius
   */
  drawSlice(ctx, startAngle, endAngle, color, centerX, centerY, radius) {
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  },

  /**
   * Render the chart legend inside #chart-legend (creating the element if absent).
   * Each entry shows a colored swatch, the category name, and the percentage.
   * Categories with pctDisplay < 1% show "< 1%" instead of the numeric value.
   * When a category is in overLimitSet, the 'over-limit' CSS class is added to
   * the legend item's swatch and label spans.
   * Requirement: 5.5, 5.6, 11.4, 11.5
   * @param {Array<{name:string, color:string, pctDisplay:number}>} categories
   * @param {Set<string>} [overLimitSet]  categories whose totals >= their limit
   */
  drawLegend(categories, overLimitSet) {
    // Find or create the legend container
    let legend = document.getElementById('chart-legend');
    if (!legend) {
      legend = document.createElement('div');
      legend.id = 'chart-legend';
      const section = document.getElementById('chart-section') || document.body;
      section.appendChild(legend);
    }

    // Clear previous content
    legend.innerHTML = '';

    categories.forEach(c => {
      const pctLabel = c.pctRaw < 1 ? '< 1%' : c.pctDisplay + '%';
      const isOverLimit = overLimitSet instanceof Set && overLimitSet.has(c.name);

      const item = document.createElement('div');
      item.className = 'legend-item';

      const swatch = document.createElement('span');
      swatch.className = isOverLimit ? 'legend-swatch over-limit' : 'legend-swatch';
      swatch.style.background = c.color;

      const label = document.createElement('span');
      label.className = isOverLimit ? 'legend-label over-limit' : 'legend-label';
      label.textContent = c.name + ': ' + pctLabel;

      item.appendChild(swatch);
      item.appendChild(label);
      legend.appendChild(item);
    });
  }
};

/* ==========================================================================
   DATA LAYER — Task 13.1: CategoryStore
   Requirements: 8.2, 8.3, 8.4, 8.5
   ========================================================================== */

const CategoryStore = {
  /** Built-in categories that are always available */
  BUILT_IN: ['Food', 'Transport', 'Entertainment', 'Health', 'Other'],

  /** localStorage key for persisting custom categories */
  STORAGE_KEY: 'expense_tracker_categories',

  /** @type {Array<string>} In-memory list of user-added custom categories */
  _custom: [],

  /**
   * Load custom categories from localStorage into memory.
   * Falls back to an empty array if the key is absent, the value is not a
   * valid JSON array, or any error occurs.
   * Requirement 8.2, 8.5
   */
  load() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw === null) {
        this._custom = [];
        return;
      }
      const parsed = JSON.parse(raw);
      this._custom = Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      this._custom = [];
    }
  },

  /**
   * Return all available categories: built-ins first, then custom ones.
   * Requirement 8.2, 8.3
   * @returns {Array<string>}
   */
  getAll() {
    return this.BUILT_IN.concat(this._custom);
  },

  /**
   * Validate and add a new custom category name.
   * Validation rules (in order):
   *   1. Trim; reject empty/whitespace-only → "Category name is required."
   *   2. Trimmed length > 30 → "Category name must be 30 characters or fewer."
   *   3. Case-insensitive duplicate in getAll() → "A category with that name already exists."
   * On success: persists and returns { isValid: true, errorMessage: '' }
   * On failure: returns { isValid: false, errorMessage: '<message>' }
   * Requirements 8.3, 8.4, 8.5
   * @param {string} name
   * @returns {{ isValid: boolean, errorMessage: string }}
   */
  add(name) {
    const trimmed = (name || '').trim();

    if (trimmed.length === 0) {
      return { isValid: false, errorMessage: 'Category name is required.' };
    }

    if (trimmed.length > 30) {
      return { isValid: false, errorMessage: 'Category name must be 30 characters or fewer.' };
    }

    const lower = trimmed.toLowerCase();
    const isDuplicate = this.getAll().some(c => c.toLowerCase() === lower);
    if (isDuplicate) {
      return { isValid: false, errorMessage: 'A category with that name already exists.' };
    }

    this._custom = [...this._custom, trimmed];
    this._save();
    return { isValid: true, errorMessage: '' };
  },

  /**
   * Persist the current custom category list to localStorage.
   * Requirement 8.5
   * @private
   */
  _save() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this._custom));
    } catch (e) {
      // Silently ignore write failures (storage quota exceeded, etc.)
    }
  }
};

/* ==========================================================================
   DATA LAYER — Task 16.1: SpendingLimitStore
   Requirements: 11.1, 11.2, 11.6
   ========================================================================== */

const SpendingLimitStore = {
  STORAGE_KEY: 'expense_tracker_limits',

  /** @type {Object} In-memory map of category → spending limit amount */
  _limits: {},

  /**
   * Load spending limits from localStorage into memory.
   * Falls back to an empty object on null, invalid JSON, or non-object data.
   * Requirement 11.2, 11.6
   */
  load() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw === null) {
        this._limits = {};
        return;
      }
      const parsed = JSON.parse(raw);
      if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
        this._limits = parsed;
      } else {
        this._limits = {};
      }
    } catch (e) {
      this._limits = {};
    }
  },

  /**
   * Set a spending limit for a category.
   * Validates that amount is a positive number in [0.01, 999999999.99].
   * Persists to localStorage on success.
   * Requirement 11.1, 11.2
   * @param {string} category
   * @param {number} amount
   * @returns {{ isValid: boolean, errorMessage?: string }}
   */
  set(category, amount) {
    if (typeof amount !== 'number' || isNaN(amount)) {
      return { isValid: false, errorMessage: 'Spending limit must be a valid number.' };
    }
    if (amount < 0.01) {
      return { isValid: false, errorMessage: 'Spending limit must be at least 0.01.' };
    }
    if (amount > 999999999.99) {
      return { isValid: false, errorMessage: 'Spending limit must not exceed 999,999,999.99.' };
    }
    this._limits[category] = amount;
    this._save();
    return { isValid: true };
  },

  /**
   * Get the spending limit for a category.
   * Returns null if no limit has been set for that category.
   * Requirement 11.1
   * @param {string} category
   * @returns {number|null}
   */
  get(category) {
    const value = this._limits[category];
    return (typeof value === 'number') ? value : null;
  },

  /**
   * Remove the spending limit for a category.
   * Persists the updated limits to localStorage.
   * Requirement 11.1, 11.2
   * @param {string} category
   */
  clear(category) {
    delete this._limits[category];
    this._save();
  },

  /**
   * Return a shallow copy of all currently set spending limits.
   * Example: { "Food": 200, "Transport": 50 }
   * Requirement 11.1
   * @returns {Object}
   */
  getAll() {
    return Object.assign({}, this._limits);
  },

  /**
   * Persist the current in-memory limits to localStorage.
   * @private
   */
  _save() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this._limits));
    } catch (e) {
      // Silently fail — in-memory state remains valid
    }
  }
};

/* ==========================================================================
   APPLICATION LAYER — Task 8.1: AppController
   Requirements: 1.2, 1.3, 2.2, 2.3, 2.8, 2.9, 4.2, 4.3, 4.4, 4.5,
                 5.6, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
   ========================================================================== */

const AppController = {
  /**
   * The currently active view panel.
   * Defaults to 'transactions' on every page load (not persisted).
   * Requirements: 9.4, 9.6
   * @type {'transactions'|'summary'|'limits'}
   */
  currentView: 'transactions',

  /**
   * Switch the active view and update the UI accordingly.
   * Updates aria-current on nav buttons, shows the selected panel,
   * hides the others, and re-renders the summary when switching to it.
   * Requirements: 9.4, 9.6
   * @param {'transactions'|'summary'|'limits'} view
   */
  handleViewToggle(view) {
    this.currentView = view;

    // Update aria-current on tab buttons
    document.querySelectorAll('#view-nav .view-tab').forEach(btn => {
      const isActive = btn.dataset.view === view;
      btn.classList.toggle('view-tab--active', isActive);
      if (isActive) {
        btn.setAttribute('aria-current', 'page');
      } else {
        btn.removeAttribute('aria-current');
      }
    });

    // Show / hide the three content panels
    // Transactions panel: the form section, list section, and chart section
    // (the first three <section> children of <main> that are not named panels)
    const transactionSections = document.querySelectorAll(
      'main > section:not(#summary-section):not(#limits-section)'
    );
    transactionSections.forEach(sec => {
      sec.hidden = (view !== 'transactions');
    });

    const summarySection = document.getElementById('summary-section');
    if (summarySection) {
      summarySection.hidden = (view !== 'summary');
    }

    const limitsSection = document.getElementById('limits-section');
    if (limitsSection) {
      limitsSection.hidden = (view !== 'limits');
    }

    // When switching to Summary, render it immediately
    if (view === 'summary') {
      SummaryView.render(MonthlySummary.compute(TransactionStore.getAll()));
    }
  },

  /**
   * Display a dismissible error toast at the bottom of the page.
   * Auto-removes after 5 seconds or when the × button is clicked.
   * @param {string} message
   */
  showErrorToast(message) {
    const toast = document.createElement('div');
    toast.className = 'error-toast';

    const text = document.createElement('span');
    text.textContent = message;

    const dismiss = document.createElement('button');
    dismiss.className = 'error-toast__dismiss';
    dismiss.textContent = '\u00D7'; // ×
    dismiss.setAttribute('aria-label', 'Dismiss error');
    dismiss.addEventListener('click', () => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    });

    toast.appendChild(text);
    toast.appendChild(dismiss);
    document.body.appendChild(toast);

    // Also announce to screen readers via the live region
    const announcer = document.getElementById('error-announcer');
    if (announcer) {
      announcer.textContent = message;
      // Reset after a moment so repeated errors trigger re-announcement
      setTimeout(() => { announcer.textContent = ''; }, 3000);
    }

    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 5000);
  },

  /**
   * Compute the set of category names whose expense total meets or exceeds
   * their configured spending limit.
   *
   * A category is included in the result if and only if:
   *   - It has a spending limit set (limits[category] is a number), AND
   *   - Its expense total in categoryTotals >= that limit
   *
   * Categories with no limit set are never included.
   *
   * Requirements: 11.3, 11.5
   * @param {Object} categoryTotals  — plain object: { category: totalAmount, … }
   * @param {Object} limits          — plain object: { category: limitAmount, … }
   * @returns {Set<string>}          — category names that are over their limit
   */
  _computeOverLimitSet(categoryTotals, limits) {
    const overLimit = new Set();
    const totals = categoryTotals || {};
    const lims   = limits || {};

    Object.keys(lims).forEach(category => {
      const limit = lims[category];
      // Only act when a numeric limit is set
      if (typeof limit !== 'number') return;

      const total = typeof totals[category] === 'number' ? totals[category] : 0;
      if (total >= limit) {
        overLimit.add(category);
      }
    });

    return overLimit;
  },

  /**
   * Refresh all UI components after any data change.
   * When the Summary view is active, re-renders the summary table so
   * additions and deletions are reflected immediately (Requirements 9.6).
   * Requirements: 1.2, 1.3, 5.6, 9.6, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6
   */
  refreshUI() {
    const balance = TransactionStore.getBalance();
    BalanceDisplay.render(balance);
    BalanceDisplay.applyStyle(balance);

    // Compute which categories are over their spending limit so both the
    // transaction list and chart can apply the 'over-limit' CSS class.
    const categoryTotals = TransactionStore.getCategoryTotals();
    const overLimitSet   = AppController._computeOverLimitSet(
      categoryTotals,
      SpendingLimitStore.getAll()
    );

    // Always refresh the transactions panel data even when hidden, so that
    // switching back to it shows up-to-date content.
    TransactionList.render(TransactionStore.getAll(), overLimitSet);
    Chart.render(categoryTotals, overLimitSet);

    // Re-render the summary when it is the active view (Requirement 9.6)
    if (this.currentView === 'summary') {
      SummaryView.render(MonthlySummary.compute(TransactionStore.getAll()));
    }

    // Re-render LimitsPanel whenever the UI refreshes so Set/Clear results
    // are immediately reflected (limits may have changed).
    LimitsPanel.render(
      CategoryStore.getAll(),
      SpendingLimitStore.getAll()
    );
  },

  /**
   * Handle the transaction form's submit event.
   * Validates all fields, shows inline errors on failure (preserving field
   * values), or builds and saves a new transaction on success.
   * Requirements: 2.2, 2.3, 2.8, 2.9, 6.1, 6.6
   * @param {Event} event
   */
  handleAddTransaction(event) {
    event.preventDefault();

    const formData = TransactionForm.getData();

    // Run all four validators
    const descResult     = Validation.validateDescription(formData.description);
    const amountResult   = Validation.validateAmount(formData.amount);
    const categoryResult = Validation.validateCategory(formData.category);
    const dateResult     = Validation.validateDate(formData.date);

    // Show per-field errors; stop if any validation failed
    let hasError = false;

    if (!descResult.isValid) {
      TransactionForm.showError('description', descResult.errorMessage);
      hasError = true;
    }
    if (!amountResult.isValid) {
      TransactionForm.showError('amount', amountResult.errorMessage);
      hasError = true;
    }
    if (!categoryResult.isValid) {
      TransactionForm.showError('category', categoryResult.errorMessage);
      hasError = true;
    }
    if (!dateResult.isValid) {
      TransactionForm.showError('date', dateResult.errorMessage);
      hasError = true;
    }

    if (hasError) {
      return;
    }

    // Build the transaction object
    const transaction = {
      id:          Formatting.generateId(),
      description: formData.description.trim(),
      amount:      Formatting.parseAmount(formData.amount),
      category:    formData.category,
      type:        formData.type,
      date:        formData.date,
      timestamp:   Date.now()
    };

    // Persist — show toast on storage failure, proceed on success
    const saved = TransactionStore.add(transaction);
    if (!saved) {
      AppController.showErrorToast(
        'Could not save your transaction. Changes will be lost on reload.'
      );
      return;
    }

    TransactionList.goToPage1();
    TransactionForm.reset();
    AppController.refreshUI();
  },

  /**
   * Handle a delete request for the given transaction id.
   * Shows a confirmation dialog before removing.
   * Requirements: 4.2, 4.3, 4.4, 4.5, 6.2, 6.6
   * @param {string} id
   */
  handleDeleteTransaction(id) {
    if (!window.confirm('Are you sure you want to delete this transaction?')) {
      return;
    }

    const deleted = TransactionStore.delete(id);
    if (!deleted) {
      AppController.showErrorToast(
        'Could not save after deletion. The transaction has been restored.'
      );
      return;
    }

    AppController.refreshUI();
  },

  /**
   * Populate the #category <select> with all available categories from
   * CategoryStore (built-ins + any persisted custom categories).
   * Clears all existing options first, then rebuilds them.
   * Called once on init and again after each successful custom category add.
   */
  populateCategorySelect() {
    const select = document.getElementById('category');
    if (!select) return;

    // Preserve the currently selected value so we can restore it after rebuild
    const previousValue = select.value;

    // Clear all options and add the placeholder
    select.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = '-- Select category --';
    select.appendChild(placeholder);

    // Append one option per category
    CategoryStore.getAll().forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      select.appendChild(opt);
    });

    // Restore previous selection if it still exists
    if (previousValue) {
      select.value = previousValue;
    }
  },

  /**
   * Handle the "Add Category" button click.
   * Reads the custom category input, calls CategoryStore.add(), and on success
   * appends the new <option> to the category <select> and selects it.
   * On failure, shows an inline validation error adjacent to the input.
   * Requirements: 8.1, 8.2, 8.3, 8.4
   */
  handleAddCategory() {
    const input = document.getElementById('custom-category-input');
    if (!input) return;

    const name = input.value;

    // Clear any previous error on this control
    AppController._clearCustomCategoryError();

    const result = CategoryStore.add(name);

    if (!result.isValid) {
      // Show inline error adjacent to the input
      AppController._showCustomCategoryError(result.errorMessage);
      return;
    }

    // Success: append the new option and select it
    const trimmedName = name.trim();
    const select = document.getElementById('category');
    if (select) {
      const opt = document.createElement('option');
      opt.value = trimmedName;
      opt.textContent = trimmedName;
      select.appendChild(opt);
      select.value = trimmedName;

      // Clear the category field's validation error since a valid category is now selected
      TransactionForm.clearError('category');
    }

    // Clear the input field
    input.value = '';
    input.focus();
  },

  /**
   * Show an inline validation error adjacent to the custom category input.
   * Follows the same pattern as TransactionForm.showError().
   * @param {string} message
   * @private
   */
  _showCustomCategoryError(message) {
    const input = document.getElementById('custom-category-input');
    if (!input) return;

    input.setAttribute('aria-invalid', 'true');

    const controls = input.parentNode; // .add-category-controls
    const existing = controls.nextElementSibling;
    if (existing && existing.classList.contains('form-error')) {
      existing.textContent = message;
      return;
    }
    // Insert error span after .add-category-controls (before the hint)
    const span = document.createElement('span');
    span.className = 'form-error';
    span.setAttribute('role', 'alert');
    span.textContent = message;
    controls.parentNode.insertBefore(span, controls.nextSibling);
  },

  /**
   * Remove the inline validation error for the custom category input.
   * @private
   */
  _clearCustomCategoryError() {
    const input = document.getElementById('custom-category-input');
    if (!input) return;

    input.removeAttribute('aria-invalid');

    const controls = input.parentNode; // .add-category-controls
    const next = controls.nextElementSibling;
    if (next && next.classList.contains('form-error')) {
      next.parentNode.removeChild(next);
    }
  },

  /**
   * Initialize the application on DOMContentLoaded.
   * Detects a storage read failure (data existed but failed to parse),
   * loads the store, wires up event listeners, and renders the initial UI.
   * Requirements: 6.3, 6.4, 6.5, 6.6
   */
  init() {
    // Detect parse failure: localStorage had data but StorageAdapter.read() returned null
    const rawData = localStorage.getItem(StorageAdapter.STORAGE_KEY);
    const parsed  = StorageAdapter.read();
    if (rawData !== null && parsed === null) {
      const banner = document.getElementById('error-banner');
      if (banner) {
        banner.textContent =
          'Could not load saved data. Your transactions from previous sessions are unavailable.';
        banner.removeAttribute('hidden');
      }
    }

    // Load transactions into memory (falls back to [] on failure)
    TransactionStore.load();

    // Load custom categories and populate the <select> with all categories
    // (Requirements 8.2, 8.5 — restore persisted custom categories on load)
    CategoryStore.load();
    AppController.populateCategorySelect();

    // Load spending limits from localStorage
    // (Requirements 11.1, 11.2, 11.6 — restore persisted limits on load)
    SpendingLimitStore.load();

    // Initialise form field defaults and auto-clear listeners
    TransactionForm.init();

    // Wire up the "Add Category" button
    const addCategoryBtn = document.getElementById('custom-category-btn');
    if (addCategoryBtn) {
      addCategoryBtn.addEventListener('click', () => {
        AppController.handleAddCategory();
      });
    }

    // Clear the custom category error when the user types in the input
    const customInput = document.getElementById('custom-category-input');
    if (customInput) {
      customInput.addEventListener('input', () => {
        AppController._clearCustomCategoryError();
      });
    }

    // Attach submit listener on the form
    const form = document.getElementById('transaction-form');
    if (form) {
      form.addEventListener('submit', (event) => {
        AppController.handleAddTransaction(event);
      });
    }

    // Attach delegated click listener on the transaction list for delete buttons
    const list = document.getElementById('transaction-list');
    if (list) {
      list.addEventListener('click', (event) => {
        const btn = event.target.closest('.delete-btn');
        if (btn && btn.dataset.id) {
          AppController.handleDeleteTransaction(btn.dataset.id);
        }
      });
    }

    // Wire up the sort-order <select> so changing it re-renders with the new order
    // Requirements: 10.2, 10.5
    const sortSelect = document.getElementById('sort-order');
    if (sortSelect) {
      sortSelect.addEventListener('change', () => {
        TransactionList.setSortOrder(sortSelect.value);
      });
    }

    // Wire up the view-toggle nav tab buttons (Transactions | Summary | Limits)
    // Requirements: 9.4, 9.6
    document.querySelectorAll('#view-nav .view-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        AppController.handleViewToggle(btn.dataset.view);
      });
    });

    // Wire up the theme toggle button (Requirement 12.1, 12.2)
    const themeToggleBtn = document.getElementById('theme-toggle');
    if (themeToggleBtn) {
      // Set the initial aria-label to reflect the current theme so the label
      // always describes what the button will switch *to*, not the current state.
      const currentTheme = document.documentElement.getAttribute('data-theme');
      themeToggleBtn.setAttribute(
        'aria-label',
        currentTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
      );

      themeToggleBtn.addEventListener('click', () => {
        ThemeController.toggle();
      });
    }

    // Apply the initial view state so panels reflect currentView on first load
    AppController.handleViewToggle(AppController.currentView);

    // Render the initial UI
    AppController.refreshUI();
  }
};

/* ==========================================================================
   APPLICATION LAYER — Task 14.1: MonthlySummary
   Requirements: 9.1, 9.2, 9.3, 9.5
   ========================================================================== */

const MonthlySummary = {
  /**
   * Group transactions by calendar month, sum income and expenses per month,
   * and return a reverse-chronologically sorted array of MonthSummary objects.
   *
   * Empty months are never created — only months that contain at least one
   * transaction appear in the result.
   *
   * Algorithm:
   *   1. Reduce transactions into a Map keyed by "YYYY-MM"
   *   2. Accumulate totalIncome / totalExpenses per key
   *   3. Compute netBalance = totalIncome - totalExpenses
   *   4. Convert map to array and sort descending by month string
   *
   * @param {Array<{date: string, type: string, amount: number}>} transactions
   * @returns {Array<{month: string, totalIncome: number, totalExpenses: number, netBalance: number}>}
   */
  compute(transactions) {
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return [];
    }

    // Build a Map<string, MonthSummary> — only months with transactions are created
    const map = transactions.reduce((acc, t) => {
      const month = (t.date || '').slice(0, 7); // "YYYY-MM"
      if (!month) return acc;

      if (!acc.has(month)) {
        acc.set(month, {
          month,
          totalIncome:   0,
          totalExpenses: 0,
          netBalance:    0
        });
      }

      const entry = acc.get(month);
      if (t.type === 'income') {
        entry.totalIncome += t.amount;
      } else if (t.type === 'expense') {
        entry.totalExpenses += t.amount;
      }

      return acc;
    }, new Map());

    // Compute netBalance and convert to array
    const summaries = [];
    map.forEach(entry => {
      entry.netBalance = entry.totalIncome - entry.totalExpenses;
      summaries.push(entry);
    });

    // Sort reverse-chronologically — lexicographic comparison on "YYYY-MM" is correct
    summaries.sort((a, b) => {
      if (a.month > b.month) return -1;
      if (a.month < b.month) return  1;
      return 0;
    });

    return summaries;
  }
};

/* ==========================================================================
   UI LAYER — Task 14.2: SummaryView
   Requirements: 9.2, 9.3
   ========================================================================== */

const SummaryView = {
  /**
   * Render the monthly summary as an accessible <table> inside #summary-section.
   * Columns: Month | Income | Expenses | Net Balance
   * Positive net balance rows receive class 'summary-row--positive';
   * negative rows receive 'summary-row--negative'.
   * Requirements 9.2, 9.3
   * @param {Array<{month:string, totalIncome:number, totalExpenses:number, netBalance:number}>} summaries
   */
  render(summaries) {
    const section = document.getElementById('summary-section');
    if (!section) return;

    if (!summaries || summaries.length === 0) {
      this.renderEmptyState();
      return;
    }

    // Build the table from scratch each render
    section.innerHTML = '<h2 id="summary-heading">Monthly Summary</h2>';

    const table = document.createElement('table');
    table.className = 'summary-table';

    // Caption for accessibility
    const caption = document.createElement('caption');
    caption.textContent = 'Monthly income, expenses, and net balance';
    table.appendChild(caption);

    // <thead>
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    ['Month', 'Income', 'Expenses', 'Net Balance'].forEach(col => {
      const th = document.createElement('th');
      th.scope = 'col';
      th.textContent = col;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // <tbody>
    const tbody = document.createElement('tbody');
    summaries.forEach(s => {
      const tr = document.createElement('tr');
      if (s.netBalance >= 0) {
        tr.className = 'summary-row--positive';
      } else {
        tr.className = 'summary-row--negative';
      }

      const tdMonth = document.createElement('td');
      tdMonth.textContent = s.month;

      const tdIncome = document.createElement('td');
      tdIncome.className = 'summary-income';
      tdIncome.textContent = Formatting.formatCurrency(s.totalIncome);

      const tdExpenses = document.createElement('td');
      tdExpenses.className = 'summary-expenses';
      tdExpenses.textContent = Formatting.formatCurrency(s.totalExpenses);

      const tdNet = document.createElement('td');
      tdNet.className = s.netBalance >= 0 ? 'summary-net summary-net--positive' : 'summary-net summary-net--negative';
      const sign = s.netBalance >= 0 ? '+' : '\u2212';
      tdNet.textContent = sign + Formatting.formatCurrency(Math.abs(s.netBalance));

      tr.appendChild(tdMonth);
      tr.appendChild(tdIncome);
      tr.appendChild(tdExpenses);
      tr.appendChild(tdNet);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    section.appendChild(table);
  },

  /**
   * Render a placeholder message when no transactions exist.
   * Requirement 9.3
   */
  renderEmptyState() {
    const section = document.getElementById('summary-section');
    if (!section) return;
    section.innerHTML =
      '<h2 id="summary-heading">Monthly Summary</h2>' +
      '<p class="empty-state">No transactions recorded yet.</p>';
  }
};

/* ==========================================================================
   APPLICATION LAYER — Task 17.3: ThemeController
   Requirements: 12.1, 12.2, 12.3, 12.4, 12.5
   ========================================================================== */

const ThemeController = {
  /** localStorage key used to persist the active theme */
  STORAGE_KEY: 'expense_tracker_theme',

  /**
   * Determine the initial theme without applying it.
   * Priority:
   *   1. Persisted preference in localStorage ('light' or 'dark')
   *   2. OS-level preference via prefers-color-scheme
   * Returns 'light' or 'dark'. Does NOT modify the DOM.
   * Requirements: 12.4, 12.5
   * @returns {'light'|'dark'}
   */
  init() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored === 'light' || stored === 'dark') {
        return stored;
      }
    } catch (e) {
      // localStorage unavailable — fall through to OS preference
    }

    // Fall back to OS preference; default to 'light' if matchMedia unavailable
    try {
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    } catch (e) {
      // matchMedia unavailable
    }

    return 'light';
  },

  /**
   * Apply a theme by setting data-theme on <html> and persisting to localStorage.
   * Requirements: 12.2, 12.3
   * @param {'light'|'dark'} theme
   */
  apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(this.STORAGE_KEY, theme);
    } catch (e) {
      // Storage failure is silently ignored — the visual change still takes effect
    }
  },

  /**
   * Read the current data-theme from <html>, flip it, apply it, persist it,
   * and update the aria-label on the toggle button (#theme-toggle) to reflect
   * the mode that the next click will switch to.
   * Requirements: 12.1, 12.2, 12.3
   */
  toggle() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';

    this.apply(next);

    // Update aria-label to describe the action the button will perform next
    const btn = document.getElementById('theme-toggle');
    if (btn) {
      btn.setAttribute(
        'aria-label',
        next === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
      );
    }
  }
};

/* ==========================================================================
   UI LAYER — Task 16.2: LimitsPanel
   Requirements: 11.1, 11.2, 11.6
   ========================================================================== */

const LimitsPanel = {
  /**
   * Render the spending limits panel inside #limits-panel-container.
   * Renders a <fieldset> with one row per category, each containing:
   *   - A label showing the category name
   *   - A number input pre-filled with the current limit (or empty if unset)
   *   - A "Set" button that saves the input value via SpendingLimitStore.set()
   *   - A "Clear" button (disabled when no limit is set) that removes the limit
   *
   * After a successful Set or Clear, calls AppController.refreshUI() so the
   * over-limit highlight state is recomputed and the panel itself reflects the
   * updated limits.
   *
   * Inline validation errors are shown directly below the input when Set is
   * clicked with an invalid amount.
   *
   * Requirements: 11.1, 11.2, 11.6
   * @param {string[]} categories  — full category list from CategoryStore.getAll()
   * @param {Object}   limits      — current limits from SpendingLimitStore.getAll()
   */
  render(categories, limits) {
    const container = document.getElementById('limits-panel-container');
    if (!container) return;

    // Clear previous content
    container.innerHTML = '';

    if (!categories || categories.length === 0) {
      const p = document.createElement('p');
      p.className = 'empty-state';
      p.textContent = 'No categories available.';
      container.appendChild(p);
      return;
    }

    const fieldset = document.createElement('fieldset');
    fieldset.className = 'limits-fieldset';

    const legend = document.createElement('legend');
    legend.textContent = 'Spending Limits per Category';
    fieldset.appendChild(legend);

    categories.forEach(category => {
      const currentLimit = (limits && typeof limits[category] === 'number')
        ? limits[category]
        : null;

      const row = document.createElement('div');
      row.className = 'limits-row';

      // Category label
      const label = document.createElement('label');
      const inputId = 'limit-input-' + category.replace(/\s+/g, '-').toLowerCase();
      label.htmlFor = inputId;
      label.className = 'limits-category-label';
      label.textContent = category;

      // Number input — pre-filled with the current limit if set
      const input = document.createElement('input');
      input.type = 'number';
      input.id = inputId;
      input.className = 'limits-amount-input';
      input.min = '0.01';
      input.max = '999999999.99';
      input.step = 'any';
      input.placeholder = 'No limit';
      if (currentLimit !== null) {
        input.value = currentLimit;
      }
      input.setAttribute('aria-label', `Spending limit for ${category}`);

      // Clear any inline error on input
      input.addEventListener('input', () => {
        const existing = row.querySelector('.limits-error');
        if (existing) existing.remove();
        input.removeAttribute('aria-invalid');
      });

      // "Set" button
      const setBtn = document.createElement('button');
      setBtn.type = 'button';
      setBtn.className = 'btn-limit-set';
      setBtn.textContent = 'Set';
      setBtn.setAttribute('aria-label', `Set spending limit for ${category}`);

      setBtn.addEventListener('click', () => {
        // Remove any previous error
        const existing = row.querySelector('.limits-error');
        if (existing) existing.remove();
        input.removeAttribute('aria-invalid');

        const rawValue = input.value.trim();
        if (rawValue === '') {
          LimitsPanel._showRowError(row, input, 'Please enter an amount.');
          return;
        }
        const parsed = parseFloat(rawValue);
        const result = SpendingLimitStore.set(category, parsed);

        if (!result.isValid) {
          LimitsPanel._showRowError(row, input, result.errorMessage);
          return;
        }

        // Re-render the panel and refresh the full UI
        AppController.refreshUI();
      });

      // "Clear" button — disabled when no limit is currently set
      const clearBtn = document.createElement('button');
      clearBtn.type = 'button';
      clearBtn.className = 'btn-limit-clear';
      clearBtn.textContent = 'Clear';
      clearBtn.setAttribute('aria-label', `Clear spending limit for ${category}`);
      clearBtn.disabled = (currentLimit === null);

      clearBtn.addEventListener('click', () => {
        SpendingLimitStore.clear(category);
        AppController.refreshUI();
      });

      row.appendChild(label);
      row.appendChild(input);
      row.appendChild(setBtn);
      row.appendChild(clearBtn);
      fieldset.appendChild(row);
    });

    container.appendChild(fieldset);
  },

  /**
   * Insert an inline error message below the input in the given row.
   * Sets aria-invalid on the input for accessibility.
   * @param {HTMLElement} row     — the row container
   * @param {HTMLInputElement} input — the number input
   * @param {string} message      — error text
   * @private
   */
  _showRowError(row, input, message) {
    input.setAttribute('aria-invalid', 'true');
    const span = document.createElement('span');
    span.className = 'limits-error form-error';
    span.setAttribute('role', 'alert');
    span.textContent = message;
    // Insert after the row's last child (after the Clear button)
    row.appendChild(span);
  }
};

/* Bootstrap — kick off the app once the DOM is ready */
document.addEventListener('DOMContentLoaded', () => AppController.init());
