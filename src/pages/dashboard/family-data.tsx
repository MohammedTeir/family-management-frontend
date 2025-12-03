//... [Existing content up to line 216]

const currentHeadGender = form.watch("headGender") || family?.headGender || "male";

//... [Existing content continues]

// Replace instances of (form.watch("headGender") || family?.headGender || "male") with currentHeadGender
// For example:

// Wife Information Card Titles
const wifeCardTitle = currentHeadGender === 'female' ? 'Wife's Info' : 'Spouse's Info';

// Spouse Field Labels
const spouseFieldLabel = `Spouse's Gender: ${currentHeadGender}`;
