
export interface Domain {
    id: string;
    domain: string;
    isActive: boolean;
    isPrivate: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Account {
    id: string;
    address: string;
    token: string;
    password?: string; // Keep password optional as we don't always use it
}

export interface Message {
    id: string;
    from: {
        address: string;
        name: string;
    };
    to: {
        address: string;
        name: string;
    }[];
    subject: string;
    intro: string;
    seen: boolean;
    createdAt: string;
}

export interface MessageDetails extends Message {
    html: string[];
    text: string;
}
