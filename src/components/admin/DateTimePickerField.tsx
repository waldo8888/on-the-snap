'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import {
  Box,
  Button,
  ButtonBase,
  FormControl,
  FormHelperText,
  InputLabel,
  Popover,
  TextField,
  Typography,
} from '@mui/material';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import type { SxProps, Theme } from '@mui/material/styles';

type DateTimePickerFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
  sx?: SxProps<Theme>;
};

const buildTimeOptions = (stepMinutes = 30) => {
  const options: Array<{ value: string; label: string }> = [];

  for (let minutes = 0; minutes < 24 * 60; minutes += stepMinutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const value = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    const displayHour = hours % 12 || 12;
    const suffix = hours >= 12 ? 'PM' : 'AM';
    const label = `${displayHour}:${mins.toString().padStart(2, '0')} ${suffix}`;
    options.push({ value, label });
  }

  return options;
};

const TIME_OPTIONS = buildTimeOptions();

const splitDateTimeValue = (value: string) => {
  if (!value) return { datePart: '', timePart: '' };

  const [datePart = '', timePart = ''] = value.split('T');
  return {
    datePart,
    timePart: timePart.slice(0, 5),
  };
};

const combineDateTimeValue = (datePart: string, timePart: string) => {
  if (!datePart || !timePart) return '';
  return `${datePart}T${timePart}`;
};

export default function DateTimePickerField({
  label,
  value,
  onChange,
  required = false,
  error = false,
  helperText,
  disabled = false,
  sx,
}: DateTimePickerFieldProps) {
  const timeFieldId = useId();
  const [{ datePart, timePart }, setParts] = useState(() => splitDateTimeValue(value));
  const [timePickerAnchor, setTimePickerAnchor] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setParts(splitDateTimeValue(value));
  }, [value]);

  const syncValue = (nextDatePart: string, nextTimePart: string) => {
    setParts({ datePart: nextDatePart, timePart: nextTimePart });
    onChange(combineDateTimeValue(nextDatePart, nextTimePart));
  };

  const handleClear = () => {
    syncValue('', '');
    setTimePickerAnchor(null);
  };

  const timePickerOpen = Boolean(timePickerAnchor);
  const selectedTimeLabel = useMemo(
    () => TIME_OPTIONS.find((option) => option.value === timePart)?.label ?? '',
    [timePart],
  );

  const basePickerSx: SxProps<Theme> = {
    '& .MuiInputBase-input': {
      color: '#f5f5f0',
    },
    '& input::-webkit-calendar-picker-indicator': {
      filter: 'invert(0.9)',
      cursor: disabled ? 'default' : 'pointer',
    },
    '& .MuiSelect-select': {
      color: '#f5f5f0',
    },
  };

  const extraPickerSx = Array.isArray(sx) ? sx : sx ? [sx] : [];

  const pickerSx = [basePickerSx, ...extraPickerSx] as SxProps<Theme>;

  const timeFieldSx = [
    basePickerSx,
    ...extraPickerSx,
    {
      '& .MuiInputBase-root': {
        cursor: disabled ? 'default' : 'pointer',
      },
      '& .MuiInputBase-input': {
        cursor: disabled ? 'default' : 'pointer',
        userSelect: 'none',
      },
    },
  ] as SxProps<Theme>;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Typography variant="body2" sx={{ color: '#f5f5f0', fontWeight: 600 }}>
          {label}
          {required ? ' *' : ''}
        </Typography>
        {!required && (
          <Button
            size="small"
            onClick={handleClear}
            disabled={disabled || (!datePart && !timePart)}
            sx={{
              minWidth: 'auto',
              px: 1,
              color: 'rgba(245,245,240,0.7)',
              textTransform: 'none',
            }}
          >
            Clear
          </Button>
        )}
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 1fr) 180px' },
          gap: 1.5,
          alignItems: 'start',
        }}
      >
        <TextField
          fullWidth
          label="Date"
          type="date"
          value={datePart}
          onChange={(event) => syncValue(event.target.value, timePart)}
          disabled={disabled}
          error={error}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={pickerSx}
        />

        <FormControl fullWidth error={error} disabled={disabled} sx={pickerSx}>
          <InputLabel htmlFor={timeFieldId} shrink>
            Time
          </InputLabel>
          <TextField
            id={timeFieldId}
            fullWidth
            value={selectedTimeLabel}
            placeholder="Select time"
            onClick={(event) => {
              if (!disabled) {
                setTimePickerAnchor(event.currentTarget);
              }
            }}
            onKeyDown={(event) => {
              if ((event.key === 'Enter' || event.key === ' ') && !disabled) {
                event.preventDefault();
                setTimePickerAnchor(event.currentTarget as HTMLElement);
              }
            }}
            error={error}
            slotProps={{
              inputLabel: { shrink: true },
              input: {
                readOnly: true,
                endAdornment: (
                  <KeyboardArrowDownRoundedIcon
                    sx={{
                      color: 'rgba(245,245,240,0.72)',
                      transform: timePickerOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                    }}
                  />
                ),
              },
            }}
            sx={timeFieldSx}
          />
          <Popover
            open={timePickerOpen}
            anchorEl={timePickerAnchor}
            onClose={() => setTimePickerAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            transformOrigin={{ vertical: 'top', horizontal: 'left' }}
            slotProps={{
              paper: {
                sx: {
                  mt: 1,
                  width: timePickerAnchor?.clientWidth ?? 180,
                  maxWidth: 'min(92vw, 280px)',
                  borderRadius: 2,
                  border: '1px solid rgba(212,175,55,0.16)',
                  bgcolor: 'rgba(10,10,10,0.96)',
                  backdropFilter: 'blur(14px)',
                  boxShadow: '0 18px 40px rgba(0,0,0,0.48)',
                  overflow: 'hidden',
                },
              },
            }}
          >
            <Box
              sx={{
                maxHeight: 320,
                overflowY: 'auto',
                overscrollBehaviorY: 'contain',
                p: 1,
              }}
              onWheelCapture={(event) => {
                event.stopPropagation();
              }}
            >
              {TIME_OPTIONS.map((option) => {
                const isSelected = option.value === timePart;

                return (
                  <ButtonBase
                    key={option.value}
                    onClick={() => {
                      syncValue(datePart, option.value);
                      setTimePickerAnchor(null);
                    }}
                    sx={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      px: 1.5,
                      py: 1.1,
                      borderRadius: 1.5,
                      color: isSelected ? '#050505' : '#f5f5f0',
                      bgcolor: isSelected ? '#D4AF37' : 'transparent',
                      transition: 'background-color 0.16s ease, transform 0.16s ease',
                      '&:hover': {
                        bgcolor: isSelected ? '#e5c150' : 'rgba(212,175,55,0.12)',
                      },
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: isSelected ? 700 : 500 }}>
                      {option.label}
                    </Typography>
                    {isSelected && <CheckRoundedIcon sx={{ fontSize: 18 }} />}
                  </ButtonBase>
                );
              })}
            </Box>
          </Popover>
        </FormControl>
      </Box>

      <FormHelperText sx={{ mx: 0, color: error ? '#ef5350' : 'text.secondary' }}>
        {helperText || 'Choose a date from the calendar and a time from the dropdown.'}
      </FormHelperText>
    </Box>
  );
}
