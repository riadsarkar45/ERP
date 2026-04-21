export const arrayToObject = (array, keySelector) => {
    return array.reduce((acc, item) => {
        const key = keySelector(item);

        if (key === undefined || key === null) {
            return acc
        }

        acc[key] = item;
        return acc;
    }, {});
}