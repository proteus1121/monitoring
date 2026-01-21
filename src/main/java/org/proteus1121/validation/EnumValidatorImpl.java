package org.proteus1121.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.util.Arrays;

public class EnumValidatorImpl implements ConstraintValidator<EnumValidator, Object> {
    private EnumValidator annotation;

    @Override
    public void initialize(EnumValidator annotation) {
        this.annotation = annotation;
    }

    @Override
    public boolean isValid(Object value, ConstraintValidatorContext context) {
        if (value == null) return true; // Use @NotNull for null check
        Object[] enumValues = this.annotation.enumClass().getEnumConstants();
        return Arrays.asList(enumValues).contains(value);
    }
}

