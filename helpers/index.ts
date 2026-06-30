export function maskCPF(value: string) {
    return value
        .replace(/\D/g, "")
        .slice(0, 11)
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
}

export function maskRG(value: string) {
    const clean = value.replace(/[^a-zA-Z0-9]/g, "")

    if (clean.length <= 9) {
        return clean
            .replace(/^([a-zA-Z0-9]{2})([a-zA-Z0-9])/, "$1.$2")
            .replace(/^([a-zA-Z0-9]{2})\.([a-zA-Z0-9]{3})([a-zA-Z0-9])/, "$1.$2.$3")
            .replace(/^([a-zA-Z0-9]{2})\.([a-zA-Z0-9]{3})\.([a-zA-Z0-9]{3})([a-zA-Z0-9]{1})$/, "$1.$2.$3-$4")
    }

    return clean.slice(0, 15)
}

export function maskPhone(value: string) {
    const numbers = value.replace(/\D/g, "").slice(0, 11)

    if (numbers.length <= 10) {
        return numbers
            .replace(/(\d{2})(\d)/, "($1) $2")
            .replace(/(\d{4})(\d)/, "$1-$2")
    }

    return numbers
        .replace(/(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{5})(\d)/, "$1-$2")
}

export function maskCNPJ(value: string) {
    return value
        .replace(/\D/g, "")
        .slice(0, 14)
        .replace(/(\d{2})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1/$2")
        .replace(/(\d{4})(\d{1,2})$/, "$1-$2")
}