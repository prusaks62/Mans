let names = [];

function createInput() {
  const input = document.getElementById("kidsNM");
  const name = input.value.trim();
  if (name !== "") {
    names.push(name);
    input.value = "";
    updateNameList();
  }
}

function updateNameList() {
  const nameList = document.getElementById("kidsnm");
  nameList.innerHTML = "Ievadītie vārdi:<br>" + names.map(n => `• ${n}`).join("<br>");
}

function deleteNM() {
  names = [];
  updateNameList();
  document.getElementById("genetB").innerHTML = "Ģenerētās grupas:";
}


function createGen() {
  const groupSize = parseInt(document.getElementById("kidsGP").value);
  if (isNaN(groupSize) || groupSize < 1) {
    alert("Ievadiet derīgu grupas izmēru.");
    return;
  }

  const shuffled = [...names];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const groups = [];
  for (let i = 0; i < shuffled.length; i += groupSize) {
    groups.push(shuffled.slice(i, i + groupSize));
  }

  const genetB = document.getElementById("genetB");
  genetB.innerHTML = "Ģenerētās grupas:<br><br>" + groups.map((group, index) =>
    `<strong>Grupa ${index + 1}:</strong><br>${group.map(n => `• ${n}`).join("<br>")}`
  ).join("<br><br>");
}
