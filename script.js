const ctx = document.getElementById("weeklyChart");

if (ctx) {
  new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],
      datasets: [{
        label: "Screen Time (hours)",
        data: [4,5,3,6,5,7,4]
      }]
    }
  });
}

const fileInput = document.getElementById("csvFile");
const status = document.getElementById("fileStatus");

if (fileInput && status) {
    fileInput.addEventListener("change", function () {
        const file = fileInput.files[0];

        status.textContent = "Selected: " + file.name;
        const reader = new FileReader();

    reader.onload = function (event) {
        const csvData = event.target.result;
        console.log(csvData);
    };

    reader.readAsText(file);
    });
}