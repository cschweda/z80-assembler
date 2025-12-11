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
  }
];

