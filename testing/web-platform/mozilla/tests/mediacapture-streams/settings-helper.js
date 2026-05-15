
function createSettingsDicts(width, height, step = 1) {
  const settingsDicts = [], aspect = width / height;
  do {
    settingsDicts.push({ width, height });
    if (width > height) {
      height = Math.round((width - step) / aspect);
      width -= step;
    } else {
      width = Math.round((height - step) * aspect);
      height -= step;
    }
  } while (width > 2 && height > 2);
  return settingsDicts;
}

function integerFitness(actual, ideal) {
  if (actual == ideal) {
    return 0;
  }
  return Math.abs(actual - ideal) / Math.max(Math.abs(actual), Math.abs(ideal));
}

function findFittestResolutionSetting(width, height, constraints) {
  const widthIsNumber = typeof constraints.width == "number";
  const heightIsNumber = typeof constraints.height == "number";
  const c = {
    width: {
      ideal: widthIsNumber ? constraints.width : constraints?.width?.ideal,
      max: constraints?.width?.max ?? 1000000,
    },
    height: {
      ideal: heightIsNumber ? constraints.height : constraints?.height?.ideal,
      max: constraints?.height?.max ?? 1000000,
    },
  };
  const dicts = createSettingsDicts(width, height)
    .filter(s => s.width <= c.width.max && s.height <= c.height.max);
  for (const dict of dicts) {
    dict.distance =
      integerFitness(dict.width, c.width.ideal) +
      integerFitness(dict.height, c.height.ideal);
  }

  const filteredDicts = dicts.filter(s => {
    return (!c.width.ideal || s.width <= c.width.ideal) &&
           (!c.height.ideal || s.height <= c.height.ideal);
  });

  return filteredDicts.reduce(
    (a, b) => (a.distance < b.distance ? a : b),
    filteredDicts[0],
  );
}
