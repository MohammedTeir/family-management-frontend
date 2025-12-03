// Assuming previous content of family-data.tsx

import React from 'react';
import { useForm } from 'react-hook-form';

const FamilyData = () => {
    const { register, watch } = useForm();
    const headGender = watch('headGender'); // Helper variable to store head gender value

    return (
        <form>
            <label>Head Gender</label>
            <select {...register('headGender')}>
                <option value="male">Male</option>
                <option value="female">Female</option>
            </select>
            <div>
                {headGender === 'male' && <p>This is a male head of family.</p>}
                {headGender === 'female' && <p>This is a female head of family.</p>}
                {/* Ensure all relevant areas in the form use headGender */}
            </div>
        </form>
    );
};

export default FamilyData;
