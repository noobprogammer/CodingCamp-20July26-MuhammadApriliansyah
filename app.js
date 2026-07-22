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
   * Format a number as an IDR (Indonesian Rupiah) currency string.
   * Uses the absolute value of the input, dot-separated thousands, no decimals.
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
   * Validate a transaction amount in IDR (Indonesian Rupiah).
   * Uses Formatting.parseAmount() to parse the raw input string.
   * Rejects empty, non-numeric, non-integer, ≤ 0, or > 999,999,999,999 values.
   * IDR amounts are always whole numbers (no cents).
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
    if (!Number.isInteger(parsed)) {
      return { isValid: false, errorMessage: 'Amount must be a whole number (IDR has no cents).' };
    }
    if (parsed <= 0) {
      return { isValid: false, errorMessage: 'Amount must be greater than 0.' };
    }
    if (parsed > 999999999999) {
      return { isValid: false, errorMessage: 'Amount is too large (max Rp 999.999.999.999).' };
    }
    return { isValid: true, errorMessage: '' };
  },

  /**
   * Validate a transaction category.
   * Accepts only the five predefined category strings.
   * Requirement 2.6
   * @param {string} value
   * @returns {{ isValid: boolean, errorMessage: string }}
   */
  validateCategory(value) {
    const VALID_CATEGORIES = ['Food', 'Transport', 'Entertainment', 'Health', 'Other'];
    if (!VALID_CATEGORIES.includes(value)) {
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
    const formatted = Formatting.formatCurrency(balance);
    // formatted is already "Rp 1.500.000"; prepend + or − (U+2212) sign
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
    type:        'type',
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
   * @returns {Object}
   */
  getData() {
    return {
      description: (document.getElementById('desc')     || {}).value || '',
      amount:      (document.getElementById('amount')   || {}).value || '',
      category:    (document.getElementById('category') || {}).value || '',
      type:        (document.getElementById('type')     || {}).value || '',
      date:        (document.getElementById('date')     || {}).value || ''
    };
  },

  /**
   * Display a validation error message adjacent to the named field.
   * Inserts a <span class="form-error"> right after the field element if one
   * does not already exist; updates its text if it does.
   * Also sets aria-invalid="true" on the field.
   * @param {string} fieldName
   * @param {string} message
   */
  showError(fieldName, message) {
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
   * Navigate to page 1.
   * Called by AppController after a new transaction is successfully added.
   */
  goToPage1() {
    this.currentPage = 1;
  },

  /**
   * Render the full transaction list inside #transaction-list.
   * Clears the container, delegates to renderEmptyState() when the array is
   * empty, otherwise renders the current page's items and (when > 50 total)
   * pagination controls.
   *
   * Pagination after delete: if the current page's slice would be empty and
   * currentPage > 1, decrement currentPage before rendering.
   *
   * Requirements 3.1, 3.3, 3.6
   * @param {Array} transactions  — sorted array from TransactionStore.getAll()
   */
  render(transactions) {
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
      ul.appendChild(this.renderItem(transaction));
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
   * Requirements 3.2, 3.4, 3.5, 4.1
   *
   * Structure:
   *   <li class="transaction-item transaction-item--[type]">
   *     <span class="transaction-description">[description]</span>
   *     <span class="transaction-amount transaction-amount--[type]">[sign][amount]</span>
   *     <span class="category-badge">[category]</span>
   *     <span class="transaction-type">[type]</span>
   *     <span class="transaction-date">[date]</span>
   *     <button class="delete-btn" data-id="[id]">Delete</button>
   *   </li>
   *
   * @param {Object} transaction
   * @returns {HTMLLIElement}
   */
  renderItem(transaction) {
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

    // Category badge
    const badge = document.createElement('span');
    badge.className = 'category-badge';
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
   * @private
   * @param {number} totalPages
   * @returns {HTMLDivElement}
   */
  _buildPagination(totalPages) {
    const div = document.createElement('div');
    div.className = 'pagination';

    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.className = 'pagination-prev';
    prevBtn.textContent = 'Previous';
    prevBtn.disabled = this.currentPage <= 1;
    prevBtn.addEventListener('click', () => {
      if (this.currentPage > 1) {
        this.currentPage -= 1;
        // Re-render using the most recent sorted transaction list
        TransactionList.render(TransactionStore.getAll());
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
        TransactionList.render(TransactionStore.getAll());
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
  /** Distinct fill colors for each category (in display order) */
  CATEGORY_COLORS: {
    Food:          '#FF6384',
    Transport:     '#36A2EB',
    Entertainment: '#FFCE56',
    Health:        '#4BC0C0',
    Other:         '#9966FF'
  },

  /**
   * Render the pie chart from category totals.
   * If all totals are zero or the object is empty, delegates to renderEmptyState().
   * Otherwise draws the pie on #chart-canvas and the legend in #chart-legend.
   * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
   * @param {Object} categoryTotals  e.g. { Food: 42.50, Transport: 15.00 }
   */
  render(categoryTotals) {
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

    // Build category data with raw percentages
    const categories = entries.map(([name, amount]) => ({
      name,
      amount,
      color: this.CATEGORY_COLORS[name] || '#CCCCCC',
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
    this.drawLegend(categories);
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
   * Requirement: 5.5, 5.6
   * @param {Array<{name:string, color:string, pctDisplay:number}>} categories
   */
  drawLegend(categories) {
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

      const item = document.createElement('div');
      item.className = 'legend-item';

      const swatch = document.createElement('span');
      swatch.className = 'legend-swatch';
      swatch.style.background = c.color;

      const label = document.createElement('span');
      label.textContent = c.name + ': ' + pctLabel;

      item.appendChild(swatch);
      item.appendChild(label);
      legend.appendChild(item);
    });
  }
};

/* ==========================================================================
   APPLICATION LAYER — Task 8.1: AppController
   Requirements: 1.2, 1.3, 2.2, 2.3, 2.8, 2.9, 4.2, 4.3, 4.4, 4.5,
                 5.6, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
   ========================================================================== */

const AppController = {
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
   * Refresh all UI components after any data change.
   * Requirements: 1.2, 1.3, 5.6
   */
  refreshUI() {
    const balance = TransactionStore.getBalance();
    BalanceDisplay.render(balance);
    BalanceDisplay.applyStyle(balance);
    TransactionList.render(TransactionStore.getAll());
    Chart.render(TransactionStore.getCategoryTotals());
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

    // Initialise form field defaults and auto-clear listeners
    TransactionForm.init();

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

    // Render the initial UI
    AppController.refreshUI();
  }
};

/* Bootstrap — kick off the app once the DOM is ready */
document.addEventListener('DOMContentLoaded', () => AppController.init());
