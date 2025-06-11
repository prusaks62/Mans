let names = []; //Izveido masīvu

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
  if (names.length === 0) {
    nameList.innerHTML = "Ievadītie vārdi:";
  } else {
    nameList.innerHTML = "Ievadītie vārdi:" + names.map  (n => `  •${n}`).join("");
  }
}

function deleteNM() {
  names.length = 0;
  updateNameList();
  document.getElementById("genetB").innerHTML = "Ģenerētās grupas:";
}

function createGen() {
  const groupSize = parseInt(document.getElementById("kidsGP").value);
  if (isNaN(groupSize) || groupSize < 1) {
    alert("Ievadiet derīgu grupas izmēru");
    return;
  }

  if (names.length === 0) {
    alert("Nav ievadītu vārdu");
    return;
  }

  const shuffled = [...names];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const totalPeople = shuffled.length;
  const numGroups = Math.ceil(totalPeople / groupSize);
  const baseGroupSize = Math.floor(totalPeople / numGroups);
  const extra = totalPeople % numGroups;

  const groups = [];
  let index = 0;

  for (let i = 0; i < numGroups; i++) {
    const currentGroupSize = baseGroupSize + (i < extra ? 1 : 0);
    groups.push(shuffled.slice(index, index + currentGroupSize));
    index += currentGroupSize;
  }

  const genetB = document.getElementById("genetB");
  genetB.innerHTML = "Ģenerētās grupas:<br>" + groups.map((group, index) =>
    `<strong>Grupa ${index + 1}:</strong><br>${group.map(n => `• ${n}`).join("<br>")}`
  ).join("<br>");
}

