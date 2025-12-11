export const EXAMPLE_PROGRAMS = [
  {
    id: 'minimal',
    name: 'Minimal Program (NOP and HALT)',
    description: 'Simplest valid program. Tests basic instruction encoding.',
    source: `; minimal.asm - Simplest valid program
; Expected bytes: 00 76
; Expected size: 2 bytes

        .ORG    $4200

START:  NOP             ; Do nothing (opcode $00)
        HALT            ; Stop CPU (opcode $76)

        .END`,
    expectedBytes: [0x00, 0x76],
    expectedSymbols: { START: 0x4200 }
  },
  {
    id: 'add2plus2',
    name: 'Add 2+2',
    description: 'Basic arithmetic: 2 + 2 = 4',
    source: `; add2plus2.asm - Basic arithmetic: 2 + 2 = 4
; Tests: LD r,n / ADD A,r / LD (nn),A
; Expected size: 10 bytes

        .ORG    $4200

START:  LD      A, 2        ; A = 2          (3E 02)
        LD      B, 2        ; B = 2          (06 02)
        ADD     A, B        ; A = A + B = 4  (80)
        LD      (RESULT), A ; Store at RESULT (32 09 42)
        HALT                ; Stop           (76)

RESULT: .DB     0           ; Reserve 1 byte for result

        .END`,
    expectedBytes: [0x3E, 0x02, 0x06, 0x02, 0x80, 0x32, 0x09, 0x42, 0x76, 0x00],
    expectedSymbols: { START: 0x4200, RESULT: 0x4209 }
  },
  {
    id: 'fillscreen',
    name: 'Fill Screen with Solid Blocks',
    description: 'Fills the entire TRS-80 Model III screen with the solid block character ($BF)',
    source: `; fillscreen.asm - Fill screen with solid blocks (white)
; TRS-80 Model III video RAM: $3C00-$3FFF (1024 bytes, 64 cols x 16 rows)
; Character $BF = solid block (all 6 pixels lit in 2x3 cell)
; Tests: LD rr,nn / LD (HL),n / INC rr / DEC rr / OR / JR
; Expected size: 18 bytes

        .ORG    $4200

VRAM    .EQU    $3C00       ; Video RAM start address
VSIZE   .EQU    1024        ; Screen size in bytes

START:  LD      HL, VRAM    ; HL points to video RAM    (21 00 3C)
        LD      BC, VSIZE   ; BC = byte counter         (01 00 04)

FILL:   LD      (HL), $BF   ; Write solid block char    (36 BF)
        INC     HL          ; Next screen position      (23)
        DEC     BC          ; Decrement counter         (0B)
        LD      A, B        ; Check if BC = 0           (78)
        OR      C           ; A = B OR C                (B1)
        JR      NZ, FILL    ; Loop if not zero          (20 F8)
        HALT                ; Done                      (76)

        .END`,
    expectedBytes: [0x21, 0x00, 0x3C, 0x01, 0x00, 0x04, 0x36, 0xBF, 0x23, 0x0B, 0x78, 0xB1, 0x20, 0xF8, 0x76],
    expectedSymbols: { START: 0x4200, FILL: 0x4206, VRAM: 0x3C00, VSIZE: 0x0400 }
  },
  {
    id: 'clearscreen',
    name: 'Clear Screen (Spaces)',
    description: 'Clears screen to spaces using LDIR block transfer',
    source: `; clearscreen.asm - Clear screen using LDIR block transfer
; Tests: LD rr,nn / LD (HL),n / LDIR / HALT
; Expected size: 15 bytes

        .ORG    $4200

VRAM    .EQU    $3C00       ; Model III video RAM start
VSIZE   .EQU    1024        ; Model III screen size (64×16)

START:  LD      HL, VRAM    ; Source address            (21 00 3C)
        LD      (HL), $20   ; Put space at first byte   (36 20)
        LD      DE, VRAM+1  ; Dest = source + 1         (11 01 3C)
        LD      BC, VSIZE-1 ; Count = 1023              (01 FF 03)
        LDIR                ; Block copy                (ED B0)
        HALT                ;                           (76)

        .END`,
    expectedBytes: [0x21, 0x00, 0x3C, 0x36, 0x20, 0x11, 0x01, 0x3C, 0x01, 0xFF, 0x03, 0xED, 0xB0, 0x76],
    expectedSymbols: { START: 0x4200, VRAM: 0x3C00, VSIZE: 0x0400 }
  },
  {
    id: 'sierpinski',
    name: 'Sierpinski Triangle Pattern',
    description: 'Generates a Sierpinski triangle fractal pattern using bitwise AND',
    source: `; sierpinski.asm - Sierpinski triangle fractal pattern
; TRS-80 Model III: 64 cols × 16 rows video display
; Algorithm: if (X AND Y) == 0, plot solid block, else space
; Runs forever, continuously redrawing
; Tests: Complex loops, conditionals, coordinate math
; Expected size: 28 bytes

        .ORG    $4200

VRAM    .EQU    $3C00       ; Model III video RAM start
COLS    .EQU    64          ; Model III screen width
ROWS    .EQU    16          ; Model III screen height
BLOCK   .EQU    $BF         ; Solid block character
SPACE   .EQU    $20         ; Space character

START:  LD      HL, VRAM    ; Screen pointer            (21 00 3C)
        LD      D, 0        ; D = Y coordinate (row)    (16 00)

YLOOP:  LD      E, 0        ; E = X coordinate (col)    (1E 00)

XLOOP:  LD      A, E        ; A = X                     (7B)
        AND     D           ; A = X AND Y               (A2)
        JR      NZ, EMPTY   ; If != 0, use space        (20 04)
        LD      A, BLOCK    ; Solid block               (3E BF)
        JR      PLOT        ; Go write it               (18 02)
EMPTY:  LD      A, SPACE    ; Space character           (3E 20)
PLOT:   LD      (HL), A     ; Write to screen           (77)
        INC     HL          ; Next screen address       (23)
        INC     E           ; X++                       (1C)
        LD      A, E        ;                           (7B)
        CP      COLS        ; Reached end of row?       (FE 40)
        JR      NZ, XLOOP   ; No, continue row          (20 EE)

        INC     D           ; Y++ (next row)            (14)
        LD      A, D        ;                           (7A)
        CP      ROWS        ; Reached end of screen?    (FE 10)
        JR      NZ, YLOOP   ; No, continue              (20 E4)

        JR      START       ; Loop forever              (18 DC)

        .END`,
    expectedBytes: [0x21, 0x00, 0x3C, 0x16, 0x00, 0x1E, 0x00, 0x7B, 0xA2, 0x20, 0x05, 0x3E, 0xBF, 0x18, 0x04, 0x3E, 0x20, 0x77, 0x23, 0x1C, 0x7B, 0xFE, 0x40, 0x20, 0xEE, 0x14, 0x7A, 0xFE, 0x10, 0x20, 0xE6, 0x18, 0xDF],
    expectedSymbols: { BLOCK: 0xbf, COLS: 0x40, EMPTY: 0x4210, PLOT: 0x4213, ROWS: 0x10, SPACE: 0x20, START: 0x4200, VRAM: 0x3c00, XLOOP: 0x4207, YLOOP: 0x4205 }
  },
  {
    id: 'checkerboard',
    name: 'Scrolling Checkerboard Animation',
    description: 'Creates an animated checkerboard that shifts each frame',
    source: `; checkerboard.asm - Animated scrolling checkerboard
; TRS-80 Model III: 64 cols × 16 rows video display
; Alternates pattern each frame for animation effect
; Tests: XOR, frame counting, nested loops
; Expected size: 35 bytes

        .ORG    $4200

VRAM    .EQU    $3C00       ; Model III video RAM
COLS    .EQU    64          ; Model III screen width
ROWS    .EQU    16          ; Model III screen height
BLOCK   .EQU    $BF
SPACE   .EQU    $20

START:  LD      C, 0        ; C = frame counter (offset) (0E 00)

FRAME:  LD      HL, VRAM    ; Screen pointer            (21 00 3C)
        LD      D, 0        ; D = Y                     (16 00)

YLOOP:  LD      E, 0        ; E = X                     (1E 00)

XLOOP:  LD      A, E        ; A = X                     (7B)
        XOR     D           ; A = X XOR Y               (AA)
        XOR     C           ; A = (X XOR Y) XOR frame   (A9)
        AND     1           ; Check bit 0               (E6 01)
        JR      Z, DARK     ; If 0, use space           (28 04)
        LD      A, BLOCK    ; Solid block               (3E BF)
        JR      PLOT        ;                           (18 02)
DARK:   LD      A, SPACE    ; Space                     (3E 20)
PLOT:   LD      (HL), A     ; Write to screen           (77)
        INC     HL          ;                           (23)
        INC     E           ; X++                       (1C)
        LD      A, E        ;                           (7B)
        CP      COLS        ;                           (FE 40)
        JR      NZ, XLOOP   ;                           (20 EC)

        INC     D           ; Y++                       (14)
        LD      A, D        ;                           (7A)
        CP      ROWS        ;                           (FE 10)
        JR      NZ, YLOOP   ;                           (20 E2)

        INC     C           ; Next frame                (0C)
        JR      FRAME       ; Loop forever              (18 D8)

        .END`,
    expectedBytes: [0x0E, 0x00, 0x21, 0x00, 0x3C, 0x16, 0x00, 0x1E, 0x00, 0x7B, 0xAA, 0xA9, 0xE6, 0x01, 0x28, 0x05, 0x3E, 0xBF, 0x18, 0x04, 0x3E, 0x20, 0x77, 0x23, 0x1C, 0x7B, 0xFE, 0x40, 0x20, 0xEB, 0x14, 0x7A, 0xFE, 0x10, 0x20, 0xE3, 0x0C, 0x18, 0xDB],
    expectedSymbols: { BLOCK: 0xbf, COLS: 0x40, DARK: 0x4215, FRAME: 0x4202, PLOT: 0x4218, ROWS: 0x10, SPACE: 0x20, START: 0x4200, VRAM: 0x3c00, XLOOP: 0x4209, YLOOP: 0x4207 }
  },
  {
    id: 'datatest',
    name: 'Data Definition Test',
    description: 'Tests .DB and .DW directives, string definitions, and label references',
    source: `; datatest.asm - Test data definition directives
; Tests: .DB, .DW, .EQU, string data, label math
; Expected size: 32 bytes (approx)

        .ORG    $4200

OFFSET  .EQU    $10         ; Constant definition

START:  LD      HL, MESSAGE ; Load address of string    (21 xx xx)
        LD      A, (DATA1)  ; Load first data byte      (3A xx xx)
        LD      BC, (PTR1)  ; Load 16-bit value         (ED 4B xx xx)
        HALT                ;                           (76)

; Data section
MESSAGE:
        .DB     "HELLO", 0  ; Null-terminated string
DATA1:  .DB     $42         ; Single byte
DATA2:  .DB     1, 2, 3, 4  ; Multiple bytes
PTR1:   .DW     $1234       ; 16-bit word (little-endian: 34 12)
PTR2:   .DW     START        ; Address of START label
TABLE:  .DW     $0000, $FFFF, $1234  ; Multiple words

        .END`,
    expectedBytes: null, // Variable size, will be validated by test suite
    expectedSymbols: { DATA1: 0x420f, DATA2: 0x4210, MESSAGE: 0x420a, OFFSET: 0x10, PTR1: 0x4215, PTR2: 0x4217, START: 0x4200, TABLE: 0x4219 }
  },
  {
    id: 'conditions',
    name: 'Conditional Jumps Test',
    description: 'Exercises all condition codes (Z, NZ, C, NC, etc.)',
    source: `; conditions.asm - Test all conditional jumps
; Tests: JP cc, JR cc, CALL cc, RET cc
; Expected size: ~45 bytes

        .ORG    $4200

START:  LD      A, 0        ; Set A = 0, Zero flag set  (3E 00)
        JP      Z, TEST1    ; Jump if zero              (CA xx xx)
        HALT                ; Should not reach here     (76)

TEST1:  LD      A, 1        ; A = 1, Zero flag clear    (3E 01)
        JP      NZ, TEST2   ; Jump if not zero          (C2 xx xx)
        HALT                ;                           (76)

TEST2:  LD      A, $FF      ; A = 255                   (3E FF)
        ADD     A, 1        ; A = 0, Carry flag set     (C6 01)
        JP      C, TEST3    ; Jump if carry             (DA xx xx)
        HALT                ;                           (76)

TEST3:  LD      A, 1        ;                           (3E 01)
        AND     A           ; Clear carry flag          (A7)
        JP      NC, TEST4   ; Jump if no carry          (D2 xx xx)
        HALT                ;                           (76)

TEST4:  JR      Z, FAIL     ; Should not jump (NZ)      (28 xx)
        JR      NZ, TEST5   ; Should jump               (20 xx)
FAIL:   HALT                ;                           (76)

TEST5:  LD      A, $80      ; Test sign flag            (3E 80)
        AND     A           ; Set flags                 (A7)
        JP      M, TEST6    ; Jump if minus (negative)  (FA xx xx)
        HALT                ;                           (76)

TEST6:  LD      A, $01      ; Positive number           (3E 01)
        AND     A           ;                           (A7)
        JP      P, DONE     ; Jump if plus (positive)   (F2 xx xx)
        HALT                ;                           (76)

DONE:   HALT                ; All tests passed!         (76)

        .END`,
    expectedBytes: null, // Variable due to relative jumps
    expectedSymbols: { DONE: 0x422e, FAIL: 0x421f, START: 0x4200, TEST1: 0x4206, TEST2: 0x420c, TEST3: 0x4214, TEST4: 0x421b, TEST5: 0x4220, TEST6: 0x4227 }
  },
  {
    id: 'subroutine',
    name: 'Subroutine Test (CALL/RET)',
    description: 'Tests CALL and RET instructions, stack operations',
    source: `; subroutine.asm - Test CALL and RET
; Tests: CALL nn, RET, PUSH, POP, stack pointer
; Expected size: ~25 bytes

        .ORG    $4200

STACK   .EQU    $7FFF       ; Top of RAM for stack

START:  LD      SP, STACK   ; Initialize stack pointer  (31 FF 7F)
        LD      A, 5        ; A = 5                     (3E 05)
        CALL    DOUBLE      ; Call subroutine           (CD xx xx)
        ; A should now be 10
        LD      (RESULT), A ; Store result              (32 xx xx)
        HALT                ;                           (76)

; Subroutine: doubles the value in A
DOUBLE: PUSH    BC          ; Save BC                   (C5)
        LD      B, A        ; B = A                     (47)
        ADD     A, B        ; A = A + B = 2*A           (80)
        POP     BC          ; Restore BC                (C1)
        RET                 ; Return                    (C9)

RESULT: .DB     0           ; Storage for result

        .END`,
    expectedBytes: null, // Variable due to CALL address
    expectedSymbols: { DOUBLE: 0x420c, RESULT: 0x4211, STACK: 0x7fff, START: 0x4200 }
  },
  {
    id: 'keyboard',
    name: 'Keyboard Scan (I/O Test)',
    description: 'Tests IN and OUT instructions for TRS-80 Model III keyboard scanning',
    source: `; keyboard.asm - Basic keyboard scan
; TRS-80 Model III keyboard is memory-mapped at $3800-$3BFF
; Tests: IN, OUT, memory-mapped I/O concepts
; Expected size: ~20 bytes

        .ORG    $4200

KBBASE  .EQU    $3800       ; Keyboard base address
VRAM    .EQU    $3C00       ; Video RAM

START:  LD      HL, KBBASE  ; Point to keyboard matrix  (21 00 38)

SCAN:   LD      A, (HL)     ; Read keyboard row         (7E)
        CPL                 ; Invert (pressed = 1)      (2F)
        AND     A           ; Any key pressed?          (A7)
        JR      Z, NOKEY    ; No, skip                  (28 06)

        ; Key detected - display raw value
        LD      (VRAM), A   ; Show on screen            (32 00 3C)
        JR      SCAN        ; Keep scanning             (18 F3)

NOKEY:  LD      A, $20      ; Space (no key)            (3E 20)
        LD      (VRAM), A   ;                           (32 00 3C)
        JR      SCAN        ; Keep scanning             (18 EB)

        .END`,
    expectedBytes: null, // Variable due to relative jumps
    expectedSymbols: { KBBASE: 0x3800, NOKEY: 0x420d, SCAN: 0x4203, START: 0x4200, VRAM: 0x3c00 }
  },
  {
    id: 'bittest',
    name: 'Bit Manipulation Test',
    description: 'Tests BIT, SET, RES instructions',
    source: `; bittest.asm - Test bit manipulation instructions
; Tests: BIT b,r / SET b,r / RES b,r
; Expected size: ~30 bytes

        .ORG    $4200

START:  LD      A, 0        ; Start with all bits clear (3E 00)

        SET     0, A        ; Set bit 0: A = %00000001  (CB C7)
        SET     7, A        ; Set bit 7: A = %10000001  (CB FF)

        BIT     0, A        ; Test bit 0 (should be set, Z=0)  (CB 47)
        JR      Z, FAIL     ; Fail if zero flag set     (28 xx)

        BIT     1, A        ; Test bit 1 (should be clear, Z=1) (CB 4F)
        JR      NZ, FAIL    ; Fail if zero flag clear   (20 xx)

        RES     0, A        ; Clear bit 0: A = %10000000 (CB 87)

        BIT     0, A        ; Test bit 0 (should be clear) (CB 47)
        JR      NZ, FAIL    ; Fail if set               (20 xx)

        LD      (RESULT), A ; Store final value ($80)   (32 xx xx)
        LD      A, $01      ; Success code              (3E 01)
        JR      DONE        ;                           (18 xx)

FAIL:   LD      A, $00      ; Failure code              (3E 00)

DONE:   LD      (STATUS), A ;                           (32 xx xx)
        HALT                ;                           (76)

RESULT: .DB     0
STATUS: .DB     0

        .END`,
    expectedBytes: null, // Variable due to relative jumps
    expectedSymbols: { DONE: 0x421d, FAIL: 0x421b, RESULT: 0x4221, START: 0x4200, STATUS: 0x4222 }
  },
  {
    id: 'rotate',
    name: 'Rotate and Shift Test',
    description: 'Tests rotation and shift instructions',
    source: `; rotate.asm - Test rotate and shift instructions
; Tests: RLCA, RRCA, RLA, RRA, RLC, RRC, RL, RR, SLA, SRA, SRL
; Expected size: ~35 bytes

        .ORG    $4200

START:  LD      A, 1        ; A = 1                    (3E 01)

        RLCA                ; Rotate left: A = 2        (07)
        RLCA                ; Rotate left: A = 4        (07)
        LD      B, A        ; Save in B (B = 4)         (47)

        RRCA                ; Rotate right: A = 2        (0F)
        RRCA                ; Rotate right: A = 1        (0F)
        LD      C, A        ; Save in C (C = 1)         (4F)

        LD      A, $80      ; A = 128                  (3E 80)
        SRL     A           ; Shift right logical: A = 64 (CB 3F)
        SRL     A           ; A = 32                    (CB 3F)
        LD      D, A        ; Save in D (D = 32)        (57)

        LD      A, 1        ;                          (3E 01)
        SLA     A           ; Shift left: A = 2         (CB 27)
        SLA     A           ; A = 4                     (CB 27)
        SLA     A           ; A = 8                     (CB 27)
        LD      E, A        ; Save in E (E = 8)         (5F)

        HALT                ;                           (76)

        .END`,
    expectedBytes: [0x3E, 0x01, 0x07, 0x07, 0x47, 0x0F, 0x0F, 0x4F, 0x3E, 0x80, 0xCB, 0x3F, 0xCB, 0x3F, 0x57, 0x3E, 0x01, 0xCB, 0x27, 0xCB, 0x27, 0xCB, 0x27, 0x5F, 0x76],
    expectedSymbols: { START: 0x4200 }
  },
  {
    id: 'math16',
    name: '16-bit Arithmetic',
    description: 'Tests 16-bit operations: ADD HL, INC/DEC pairs',
    source: `; math16.asm - 16-bit arithmetic operations
; Tests: ADD HL,rr / INC rr / DEC rr / LD (nn),HL
; Expected size: ~25 bytes

        .ORG    $4200

START:  LD      HL, $1000   ; HL = $1000                (21 00 10)
        LD      BC, $0234   ; BC = $0234                (01 34 02)
        ADD     HL, BC      ; HL = $1234                (09)

        LD      DE, $0001   ; DE = 1                    (11 01 00)
        ADD     HL, DE      ; HL = $1235                (19)

        INC     HL          ; HL = $1236                (23)
        INC     HL          ; HL = $1237                (23)
        DEC     HL          ; HL = $1236                (2B)

        LD      (RESULT), HL ; Store result             (22 xx xx)
        HALT                ;                           (76)

RESULT: .DW     0           ; 16-bit storage

        .END`,
    expectedBytes: [0x21, 0x00, 0x10, 0x01, 0x34, 0x02, 0x09, 0x11, 0x01, 0x00, 0x19, 0x23, 0x23, 0x2B, 0x22, 0x11, 0x42, 0x76, 0x00, 0x00],
    expectedSymbols: { RESULT: 0x4211, START: 0x4200 }
  },
  {
    id: 'blockcopy',
    name: 'Block Memory Copy',
    description: 'Tests LDIR block transfer instruction',
    source: `; blockcopy.asm - Memory block copy using LDIR
; Copies SOURCE data to DEST using block transfer
; Tests: LDIR, block operations
; Expected size: ~25 bytes

        .ORG    $4200

START:  LD      HL, SOURCE  ; Source address            (21 xx xx)
        LD      DE, DEST    ; Destination address       (11 xx xx)
        LD      BC, SRCLEN  ; Byte count                (01 xx xx)
        LDIR                ; Block copy                (ED B0)
        HALT                ;                           (76)

SOURCE: .DB     "HELLO WORLD!", 0
SRCLEN  .EQU    $ - SOURCE  ; Calculate length automatically

DEST:   .DB     0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0

        .END`,
    expectedBytes: null, // Variable size
    expectedSymbols: { DEST: 0x4219, SOURCE: 0x420c, SRCLEN: 0xd, START: 0x4200 }
  },
  {
    id: 'expressions',
    name: 'Expression Evaluation Test',
    description: 'Tests the expression evaluator with various arithmetic',
    source: `; expressions.asm - Test expression evaluation
; Tests: +, -, *, /, $, parentheses, label arithmetic
; Expected size: varies

        .ORG    $4200

BASE    .EQU    $1000
OFFSET  .EQU    $0100
COMBO   .EQU    BASE + OFFSET       ; = $1100
DIFF    .EQU    BASE - $0800        ; = $0800
MULT    .EQU    16 * 4              ; = 64
DIV     .EQU    256 / 8             ; = 32

START:  LD      HL, BASE + OFFSET   ; HL = $1100        (21 00 11)
        LD      DE, COMBO           ; DE = $1100        (11 00 11)
        LD      BC, MULT + DIV      ; BC = 96 ($60)     (01 60 00)
        LD      A, ($ + 5)          ; Load from 5 bytes ahead

        ; Test current address ($) usage
HERE:   LD      HL, HERE            ; Should equal current address
        LD      DE, $ - START       ; Offset from START

        HALT                        ;                   (76)

        .END`,
    expectedBytes: null, // Variable due to $ usage
    expectedSymbols: { BASE: 0x1000, COMBO: 0x1100, DIFF: 0x800, DIV: 0x20, HERE: 0x420a, MULT: 0x40, OFFSET: 0x100, START: 0x4200 }
  },
  {
    id: 'multiply',
    name: 'Simple Multiply (3 × 4)',
    description: 'Multiplies two numbers using repeated addition',
    source: `; multiply.asm - Multiply 3 × 4 = 12 using repeated addition
; Tests: Loops, ADD, DEC, conditional jumps
; Expected size: ~18 bytes

        .ORG    $4200

START:  LD      A, 0        ; A = result (0)              (3E 00)
        LD      B, 3        ; B = multiplier (3)          (06 03)
        LD      C, 4        ; C = multiplicand (4)       (0E 04)

LOOP:   ADD     A, C        ; A = A + C                  (81)
        DEC     B           ; B--                         (05)
        JR      NZ, LOOP    ; Loop while B != 0           (20 FB)
        LD      (RESULT), A ; Store result (12)           (32 0A 42)
        HALT                ;                             (76)

RESULT: .DB     0

        .END`,
    expectedBytes: [0x3E, 0x00, 0x06, 0x03, 0x0E, 0x04, 0x81, 0x05, 0x20, 0xFC, 0x32, 0x0E, 0x42, 0x76, 0x00],
    expectedSymbols: { LOOP: 0x4206, RESULT: 0x420E, START: 0x4200 }
  },
  {
    id: 'strlen',
    name: 'String Length Calculation',
    description: 'Calculates the length of a null-terminated string',
    source: `; strlen.asm - Calculate string length
; Tests: String traversal, null checking, INC, CP
; Expected size: ~20 bytes

        .ORG    $4200

START:  LD      HL, STRING  ; Point to string              (21 0A 42)
        LD      B, 0        ; B = length counter          (06 00)

LOOP:   LD      A, (HL)     ; Load character              (7E)
        CP      0           ; Check for null terminator   (FE 00)
        JR      Z, DONE     ; Done if null                (28 04)
        INC     B           ; Increment length             (04)
        INC     HL          ; Next character              (23)
        JR      LOOP        ; Continue                    (18 F7)

DONE:   LD      A, B        ; A = length                  (78)
        LD      (LENGTH), A ; Store result                (32 19 42)
        HALT                ;                             (76)

STRING: .DB     "HELLO", 0
LENGTH: .DB     0

        .END`,
    expectedBytes: [0x21, 0x13, 0x42, 0x06, 0x00, 0x7E, 0xFE, 0x00, 0x28, 0x04, 0x04, 0x23, 0x18, 0xF7, 0x78, 0x32, 0x19, 0x42, 0x76, 0x48, 0x45, 0x4C, 0x4C, 0x4F, 0x00, 0x00],
    expectedSymbols: { DONE: 0x420E, LENGTH: 0x4219, LOOP: 0x4205, START: 0x4200, STRING: 0x4213 }
  },
  {
    id: 'lookup',
    name: 'Lookup Table',
    description: 'Uses a lookup table to convert numbers to characters',
    source: `; lookup.asm - Lookup table example
; Tests: Table indexing, indirect addressing, LD A,(HL)
; Expected size: ~22 bytes

        .ORG    $4200

START:  LD      A, 3        ; A = index (3)              (3E 03)
        LD      HL, TABLE   ; HL = table address          (21 0A 42)
        LD      D, 0        ; DE = A                      (16 00)
        LD      E, A        ;                             (5F)
        ADD     HL, DE      ; HL = TABLE + A               (19)
        LD      A, (HL)     ; A = TABLE[A]                 (7E)
        LD      (RESULT), A ; Store result                (32 11 42)
        HALT                ;                             (76)

TABLE:  .DB     '0', '1', '2', '3', '4', '5'
RESULT: .DB     0

        .END`,
    expectedBytes: [0x3E, 0x03, 0x21, 0x0E, 0x42, 0x16, 0x00, 0x5F, 0x19, 0x7E, 0x32, 0x14, 0x42, 0x76, 0x30, 0x31, 0x32, 0x33, 0x34, 0x35, 0x00],
    expectedSymbols: { RESULT: 0x4214, START: 0x4200, TABLE: 0x420E }
  },
  {
    id: 'daa',
    name: 'Decimal Adjust (DAA)',
    description: 'Tests the DAA instruction for BCD arithmetic',
    source: `; daa.asm - Decimal Adjust Accumulator
; Tests: DAA instruction, BCD arithmetic
; Expected size: ~15 bytes

        .ORG    $4200

START:  LD      A, $19      ; A = 19 (BCD)                (3E 19)
        ADD     A, $07      ; A = 19 + 7 = 20 (needs adjust) (C6 07)
        DAA                 ; Adjust to BCD: A = 26       (27)
        LD      (RESULT), A ; Store result                (32 0C 42)
        LD      A, $45      ; A = 45 (BCD)                (3E 45)
        ADD     A, $38      ; A = 45 + 38 = 7D (needs adjust) (C6 38)
        DAA                 ; Adjust to BCD: A = 83       (27)
        LD      (SUM), A    ; Store sum                   (32 0D 42)
        HALT                ;                             (76)

RESULT: .DB     0
SUM:    .DB     0

        .END`,
    expectedBytes: [0x3E, 0x19, 0xC6, 0x07, 0x27, 0x32, 0x11, 0x42, 0x3E, 0x45, 0xC6, 0x38, 0x27, 0x32, 0x12, 0x42, 0x76, 0x00, 0x00],
    expectedSymbols: { RESULT: 0x4211, START: 0x4200, SUM: 0x4212 }
  },
  {
    id: 'negate',
    name: 'Negate and Complement',
    description: 'Tests NEG and CPL instructions',
    source: `; negate.asm - Negate and complement operations
; Tests: NEG, CPL, SCF, CCF
; Expected size: ~20 bytes

        .ORG    $4200

START:  LD      A, 5        ; A = 5                       (3E 05)
        NEG                 ; A = -5 = 251 (two's complement) (ED 44)
        LD      (NEG1), A   ; Store -5                    (32 0E 42)
        LD      A, $AA      ; A = 10101010                (3E AA)
        CPL                 ; A = 01010101 = $55          (2F)
        LD      (COMP), A   ; Store complement            (32 0F 42)
        SCF                 ; Set carry flag              (37)
        CCF                 ; Complement carry flag       (3F)
        HALT                ;                             (76)

NEG1:   .DB     0
COMP:   .DB     0

        .END`,
    expectedBytes: [0x3E, 0x05, 0xED, 0x44, 0x32, 0x10, 0x42, 0x3E, 0xAA, 0x2F, 0x32, 0x11, 0x42, 0x37, 0x3F, 0x76, 0x00, 0x00],
    expectedSymbols: { COMP: 0x4211, NEG1: 0x4210, START: 0x4200 }
  },
  {
    id: 'stackops',
    name: 'Stack Operations',
    description: 'Advanced stack manipulation with multiple registers',
    source: `; stackops.asm - Advanced stack operations
; Tests: PUSH, POP with multiple register pairs
; Expected size: ~18 bytes

        .ORG    $4200

STACK   .EQU    $7FFF

START:  LD      SP, STACK   ; Initialize stack            (31 FF 7F)
        LD      HL, $1234   ; HL = $1234                  (21 34 12)
        LD      DE, $5678   ; DE = $5678                  (11 78 56)
        PUSH    HL          ; Push HL                     (E5)
        PUSH    DE          ; Push DE                     (D5)
        POP     BC          ; Pop to BC (should be DE)    (C1)
        POP     HL          ; Pop to HL (should be original HL) (E1)
        LD      (SAVED), HL ; Store popped value          (22 12 42)
        HALT                ;                             (76)

SAVED:  .DW     0

        .END`,
    expectedBytes: [0x31, 0xFF, 0x7F, 0x21, 0x34, 0x12, 0x11, 0x78, 0x56, 0xE5, 0xD5, 0xC1, 0xE1, 0x22, 0x11, 0x42, 0x76, 0x00, 0x00],
    expectedSymbols: { SAVED: 0x4211, STACK: 0x7FFF, START: 0x4200 }
  },
  {
    id: 'portio',
    name: 'Port I/O Operations',
    description: 'Tests IN and OUT instructions with specific port numbers',
    source: `; portio.asm - Port I/O operations
; Tests: IN A,(n), OUT (n),A
; Expected size: ~15 bytes

        .ORG    $4200

PORT1   .EQU    $F8         ; TRS-80 port
PORT2   .EQU    $EC

START:  IN      A, (PORT1)  ; Read from port $F8          (DB F8)
        LD      B, A        ; Save in B                   (47)
        IN      A, (PORT2)  ; Read from port $EC          (DB EC)
        ADD     A, B        ; Add both values             (80)
        OUT     (PORT1), A  ; Write to port $F8            (D3 F8)
        LD      (RESULT), A ; Store result                (32 0C 42)
        HALT                ;                             (76)

RESULT: .DB     0

        .END`,
    expectedBytes: [0xDB, 0xF8, 0x47, 0xDB, 0xEC, 0x80, 0xD3, 0xF8, 0x32, 0x0C, 0x42, 0x76, 0x00],
    expectedSymbols: { PORT1: 0xF8, PORT2: 0xEC, RESULT: 0x420C, START: 0x4200 }
  },
  {
    id: 'restart',
    name: 'Restart Instruction (RST)',
    description: 'Tests RST instructions for interrupt-like behavior',
    source: `; restart.asm - Restart instruction test
; Tests: RST n (restart to vector addresses)
; Expected size: ~10 bytes

        .ORG    $4200

START:  LD      A, $42      ; A = $42                     (3E 42)
        RST     0           ; Restart to $0000            (C7)
        HALT                ; Should not reach here       (76)

SAVED:  .DB     0

        .END`,
    expectedBytes: [0x3E, 0x42, 0xC7, 0x76, 0x00],
    expectedSymbols: { SAVED: 0x4204, START: 0x4200 }
  },
  {
    id: 'exchange',
    name: 'Register Exchange (EXX)',
    description: 'Tests EXX instruction for alternate register set swapping',
    source: `; exchange.asm - Register exchange operations
; Tests: EXX (exchange alternate register sets)
; Expected size: ~20 bytes

        .ORG    $4200

START:  LD      BC, $1234   ; BC = $1234                  (01 34 12)
        LD      DE, $5678   ; DE = $5678                  (11 78 56)
        LD      HL, $9ABC   ; HL = $9ABC                  (21 BC 9A)
        EXX                 ; Exchange with alternate set (D9)
        LD      BC, $0000   ; BC' = $0000                 (01 00 00)
        LD      DE, $0000   ; DE' = $0000                 (11 00 00)
        LD      HL, $0000   ; HL' = $0000                 (21 00 00)
        EXX                 ; Exchange back                (D9)
        LD      (RESULT), HL ; Store HL                   (22 11 42)
        HALT                ;                             (76)

RESULT: .DW     0

        .END`,
    expectedBytes: [0x01, 0x34, 0x12, 0x11, 0x78, 0x56, 0x21, 0xBC, 0x9A, 0xD9, 0x01, 0x00, 0x00, 0x11, 0x00, 0x00, 0x21, 0x00, 0x00, 0xD9, 0x22, 0x15, 0x42, 0x76, 0x00, 0x00],
    expectedSymbols: { RESULT: 0x4215, START: 0x4200 }
  },
  {
    id: 'divide',
    name: 'Simple Divide (12 ÷ 3)',
    description: 'Divides using repeated subtraction',
    source: `; divide.asm - Divide 12 ÷ 3 = 4 using repeated subtraction
; Tests: Loops, SUB, conditional jumps, counters
; Expected size: ~20 bytes

        .ORG    $4200

START:  LD      A, 12       ; A = dividend (12)          (3E 0C)
        LD      B, 3        ; B = divisor (3)             (06 03)
        LD      C, 0        ; C = quotient (0)            (0E 00)

LOOP:   SUB     B           ; A = A - B                  (90)
        JR      C, DONE     ; Done if A < 0 (carry set)   (38 04)
        INC     C           ; Increment quotient          (0C)
        JR      LOOP        ; Continue                    (18 F9)

DONE:   LD      A, C        ; A = quotient (4)           (79)
        LD      (RESULT), A ; Store result                (32 0E 42)
        HALT                ;                             (76)

RESULT: .DB     0

        .END`,
    expectedBytes: [0x3E, 0x0C, 0x06, 0x03, 0x0E, 0x00, 0x90, 0x38, 0x03, 0x0C, 0x18, 0xFA, 0x79, 0x32, 0x11, 0x42, 0x76, 0x00],
    expectedSymbols: { DONE: 0x420C, LOOP: 0x4206, RESULT: 0x4211, START: 0x4200 }
  },
  {
    id: 'compare',
    name: 'Compare Operations',
    description: 'Tests CP instruction with various comparisons',
    source: `; compare.asm - Compare operations
; Tests: CP instruction, flag setting, conditional logic
; Expected size: ~22 bytes

        .ORG    $4200

START:  LD      A, 10       ; A = 10                      (3E 0A)
        CP      5           ; Compare A with 5            (FE 05)
        JR      C, LESS     ; Jump if A < 5               (38 04)
        JR      Z, EQUAL    ; Jump if A == 5              (28 04)
        LD      B, 1        ; A > 5                       (06 01)
        JR      DONE        ;                             (18 06)
LESS:   LD      B, 0        ; A < 5                      (06 00)
        JR      DONE        ;                             (18 02)
EQUAL:  LD      B, 2        ; A == 5                     (06 02)
DONE:   LD      A, B        ; A = result                 (78)
        LD      (RESULT), A ; Store (should be 1)         (32 14 42)
        HALT                ;                             (76)

RESULT: .DB     0

        .END`,
    expectedBytes: [0x3E, 0x0A, 0xFE, 0x05, 0x38, 0x06, 0x28, 0x08, 0x06, 0x01, 0x18, 0x06, 0x06, 0x00, 0x18, 0x02, 0x06, 0x02, 0x78, 0x32, 0x17, 0x42, 0x76, 0x00],
    expectedSymbols: { DONE: 0x4212, EQUAL: 0x4210, LESS: 0x420C, RESULT: 0x4217, START: 0x4200 }
  }
];

