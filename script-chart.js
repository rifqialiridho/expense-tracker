let total = 0;
const expenses = [];
const chartData = {};

const tableBody = document.querySelector('#expense-table tbody');
const totalDisplay = document.getElementById('total');
const form = document.getElementById('expense-form');
const categoryFilter = document.getElementById('filter-category');

const ctx = document.getElementById('expenseChart').getContext('2d');
const chart = new Chart(ctx, {
  type: 'bar',
  data: {
    labels: [],
    datasets: [{
      label: 'Pengeluaran per Kategori (Rp)',
      data: [],
      backgroundColor: 'rgba(54, 162, 235, 0.7)',
      borderColor: 'rgba(54, 162, 235, 1)',
      borderWidth: 1
    }]
  },
  options: {
    responsive: true,
    scales: {
      y: { beginAtZero: true }
    }
  }
});

// Load dari localStorage saat halaman dibuka
window.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('expenses');
  if (saved) {
    const parsed = JSON.parse(saved);
    parsed.forEach(e => expenses.push(e));
    updateTable();
    updateChart();
    populateCategoryFilter(); // <-- Tambahan di sini
  }
});

// Event listener delete button – placed globally
tableBody.addEventListener("click", function(e) {
  if (e.target.classList.contains("delete-btn")) {
    const idToDelete = parseFloat(e.target.getAttribute("data-id"));
    const index = expenses.findIndex(exp => exp.id === idToDelete);
    if (index !== -1) {
      expenses.splice(index, 1);
      saveToLocalStorage();
      updateTable();
      updateChart();
      populateCategoryFilter();
    }
  }
});



// Simpan ke localStorage setiap kali data ditambahkan
function saveToLocalStorage() {
  localStorage.setItem('expenses', JSON.stringify(expenses));
}

// Submit form
form.addEventListener('submit', function(e) {
  e.preventDefault();

  const date = document.getElementById('date').value;
  const category = document.getElementById('category').value;
  const description = document.getElementById('description').value;
  const amount = parseInt(document.getElementById('amount').value);

  const expense = {
  id: Date.now(), // ID unik
  date,
  category,
  description,
  amount
};

  expenses.push(expense);
  saveToLocalStorage();

  updateTable();
  updateChart();
  populateCategoryFilter(); // <-- Tambahan di sini
  form.reset();
});

// Populate year options
function populateYears() {
  const yearSelect = document.getElementById('filter-year');
  const years = [...new Set(expenses.map(e => e.date.split('-')[0]))];
  yearSelect.innerHTML = '<option value="">Semua</option>';
  years.forEach(y => {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    yearSelect.appendChild(opt);
  });
}

// Populate category filter
function populateCategoryFilter() {
  const categorySelect = document.getElementById("filter-category");
  const categories = [...new Set(expenses.map(e => e.category))];
  categorySelect.innerHTML = '<option value="">Semua</option>';
  categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    categorySelect.appendChild(opt);
  });
}

// Filter event
document.getElementById('filter-month').addEventListener('change', updateTable);
document.getElementById('filter-year').addEventListener('change', updateTable);
categoryFilter.addEventListener('change', updateTable);

// Update Table
function updateTable() {
  tableBody.innerHTML = '';
  let filteredExpenses = expenses;
  const categoryVal = categoryFilter.value;
  const monthVal = document.getElementById('filter-month').value;
  const yearVal = document.getElementById('filter-year').value;

  if (categoryVal) {
    filteredExpenses = filteredExpenses.filter(e => e.category === categoryVal);
  }
  if (monthVal) {
    filteredExpenses = filteredExpenses.filter(e => e.date.split('-')[1] === monthVal);
  }
  if (yearVal) {
    filteredExpenses = filteredExpenses.filter(e => e.date.split('-')[0] === yearVal);
  }

  let sum = 0;
  const searchTerm = document.getElementById("search-input").value.toLowerCase();
  if (searchTerm) {
    filteredExpenses = filteredExpenses.filter(e => e.description.toLowerCase().includes(searchTerm));
  }

  if (currentSort.key) {
    filteredExpenses.sort((a, b) => {
      const valA = a[currentSort.key];
      const valB = b[currentSort.key];
      if (typeof valA === "number") return currentSort.asc ? valA - valB : valB - valA;
      return currentSort.asc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });
  }

  updateMonthlySummary(filteredExpenses);


  filteredExpenses.forEach((e, index) => {
    const row = tableBody.insertRow();
    row.innerHTML = `
  <td>${e.date}</td>
  <td>${e.category}</td>
  <td>${e.description}</td>
  <td>${e.amount.toLocaleString()}</td>
  <td><button class="delete-btn" data-id="${e.id}">Delete</button></td>
`;
    sum += e.amount;
  });

// Handle tombol Delete


  totalDisplay.textContent = sum.toLocaleString();

  // Tambahan untuk Card Total
  document.getElementById("total-amount").textContent = "Rp " + sum.toLocaleString();
  document.getElementById("total-transactions").textContent = filteredExpenses.length + " item";
}

// Update Chart
function updateChart() {
  chartDataClear();

  for (let exp of expenses) {
    if (chartData[exp.category]) {
      chartData[exp.category] += exp.amount;
    } else {
      chartData[exp.category] = exp.amount;
    }
  }

  chart.data.labels = Object.keys(chartData);
  chart.data.datasets[0].data = Object.values(chartData);
  chart.update();

  populateYears();
}

function chartDataClear() {
  for (let key in chartData) {
    delete chartData[key];
  }
}

// Export to Excel (CSV)
document.getElementById('export-btn').addEventListener('click', function () {
  let csv = 'Tanggal,Kategori,Deskripsi,Jumlah (Rp)\n';
  const rows = document.querySelectorAll('#expense-table tbody tr');
  rows.forEach(row => {
    const cols = row.querySelectorAll('td');
    const rowData = Array.from(cols).map(td => td.textContent.replace(/,/g, '')).join(',');
    csv += rowData + '\n';
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'pengeluaran.csv';
  link.click();
});

// CSV Upload Handler
document.getElementById("upload-csv").addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (event) {
    const lines = event.target.result.split("\n").filter(line => line.trim());
    for (const line of lines.slice(1)) { // skip header
      const [date, category, description, amount] = line.split(",");
      if (!date || !category || !description || !amount) continue;

      const expense = {
  id: Date.now() + Math.random(), // Supaya tetap unik
  date: date.trim(),
  category: category.trim(),
  description: description.trim(),
  amount: parseFloat(amount.trim())
};

      expenses.push(expense);
    }
    saveToLocalStorage();
    updateTable();
    updateChart();
    populateCategoryFilter(); // <-- Tambahan di sini
  };
  reader.readAsText(file);
});

document.getElementById("upload-excel").addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (event) {
    const data = new Uint8Array(event.target.result);
    const workbook = XLSX.read(data, { type: "array" });

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    jsonData.forEach(row => {
      const { Tanggal, Kategori, Deskripsi, Jumlah } = row;

      if (Tanggal && Kategori && Deskripsi && Jumlah) {
        const expense = {
  id: Date.now() + Math.random(),
  date: formatDate(Tanggal),
  category: Kategori.trim(),
  description: Deskripsi.trim(),
  amount: parseFloat(Jumlah)
};
        expenses.push(expense);
      }
    });

    saveToLocalStorage();
    updateTable();
    updateChart();
    populateCategoryFilter();
  };
  reader.readAsArrayBuffer(file);
});

function formatDate(excelDate) {
  if (typeof excelDate === "string") return excelDate;
  const jsDate = new Date((excelDate - 25569) * 86400 * 1000);
  return jsDate.toISOString().split("T")[0];
}


// === Search Bar Filter ===
document.getElementById("search-input").addEventListener("input", updateTable);

// === Backup JSON ===
document.getElementById("backup-json").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(expenses, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "expenses-backup.json";
  link.click();
  URL.revokeObjectURL(url);
});

// === Restore JSON ===
document.getElementById("restore-json").addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (event) {
    try {
      const imported = JSON.parse(event.target.result);
      if (Array.isArray(imported)) {
        expenses.length = 0;
        imported.forEach(e => expenses.push(e));
        saveToLocalStorage();
        updateTable();
        updateChart();
        populateCategoryFilter();
      }
    } catch (err) {
      alert("File tidak valid!");
    }
  };
  reader.readAsText(file);
});

// === Monthly Summary ===
function updateMonthlySummary(filteredExpenses) {
  let total = 0;
  const categoryTotals = {};

  filteredExpenses.forEach(e => {
    total += e.amount;
    if (!categoryTotals[e.category]) categoryTotals[e.category] = 0;
    categoryTotals[e.category] += e.amount;
  });

  const topCategory = Object.entries(categoryTotals).sort((a,b) => b[1]-a[1])[0]?.[0] || "-";
  document.getElementById("monthly-total").textContent = "Rp " + total.toLocaleString();
  document.getElementById("top-category").textContent = topCategory;
}

// === Sorting ===
let currentSort = { key: null, asc: true };
document.querySelectorAll("#expense-table th").forEach((th, index) => {
  th.style.cursor = "pointer";
  th.addEventListener("click", () => {
    const keys = ["date", "category", "description", "amount"];
    const key = keys[index];
    if (!key) return;

    currentSort.asc = currentSort.key === key ? !currentSort.asc : true;
    currentSort.key = key;
    updateTable();
  });
});




// ===== CSV & Excel Upload Handler Enhancement =====

// Mapping fungsi untuk header fleksibel
function mapHeaders(row) {
  const map = {
    'tanggal': 'Tanggal',
    'date': 'Tanggal',
    'kategori': 'Kategori',
    'category': 'Kategori',
    'deskripsi': 'Deskripsi',
    'description': 'Deskripsi',
    'jumlah': 'Jumlah',
    'jumlah (rp)': 'Jumlah',
    'amount': 'Jumlah'
  };
  const mapped = {};
  for (const key in row) {
    const normalized = key.toLowerCase().trim();
    if (map[normalized]) {
      mapped[map[normalized]] = row[key];
    }
  }
  return mapped;
}

// Validasi baris
function isValidRow(row) {
  return (
    row.Tanggal &&
    row.Kategori &&
    row.Deskripsi &&
    row.Jumlah &&
    !isNaN(parseFloat(row.Jumlah))
  );
}

// Helper universal import
function importExpenses(rows) {
  const validRows = rows.map(mapHeaders).filter(isValidRow);
  if (validRows.length === 0) {
    alert("Tidak ada data valid yang bisa dimasukkan.");
    return;
  }
  const newExpenses = validRows.map(row => ({
    id: Date.now() + Math.random(),
    date: row.Tanggal,
    category: row.Kategori,
    description: row.Deskripsi,
    amount: parseFloat(row.Jumlah)
  }));
  expenses.push(...newExpenses);
  saveToLocalStorage();
  updateTable();
  updateChart();
  populateCategoryFilter();
}
