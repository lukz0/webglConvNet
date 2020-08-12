export default (size: 1 | 2 | 3 | 4, on1: string, on2: string, on3: string, on4: string) => {
    switch (size) {
        case 1:
            return on1;
        case 2:
            return on2;
        case 3:
            return on3;
        case 4:
            return on4;
    }
};