import React from 'react';
import { Card, CardHeader, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Users, Search, XCircle, Loader2 } from 'lucide-react';
import BorrowerList from './BorrowerList.jsx';
import DecisionBadge from './DecisionBadge.jsx';

const SearchPanel = ({ searchQuery, onSearchChange, users, loading, onSelectUser }) => (
  <Card className="mb-8 overflow-hidden border-0 bg-card shadow-lg transition-all duration-300 hover:shadow-xl">
    <CardHeader className="bg-gradient-to-r from-muted/50 to-muted/30 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search borrowers by name, email, or phone..."
              className="pl-12 h-12 border-0 bg-background shadow-inner text-lg placeholder:text-muted-foreground focus:ring-2 focus:ring-indigo-500"
              value={searchQuery}
              onChange={onSearchChange}
            />
          </div>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={() => onSearchChange({ target: { value: '' } })}
            disabled={!searchQuery}
            className="h-12 border-border bg-background hover:bg-muted transition-colors"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Clear
          </Button>
          <Button 
            className="h-12 bg-gradient-to-r from-indigo-500 to-purple-500 hover:opacity-90 transition-opacity shadow-lg"
            onClick={() => onSearchChange({ target: { value: searchQuery } })}
          >
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
        </div>
      </div>
    </CardHeader>
    
    <CardContent className="p-0">
      {users.length > 0 ? (
        <div className="animate-fade-in">
          <BorrowerList
            users={users}
            handleUserSelect={onSelectUser}
            renderDecisionBadge={DecisionBadge}
          />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-12 text-center">
          {loading ? (
            <div className="space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
              <p className="text-muted-foreground">Searching borrowers...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-full bg-muted p-6">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">No borrowers found</h3>
                <p className="text-muted-foreground">Start typing to search for borrowers</p>
              </div>
            </div>
          )}
        </div>
      )}
    </CardContent>
  </Card>
);

export default SearchPanel;


